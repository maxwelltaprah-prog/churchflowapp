import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSecureOTP, hashOTP, addTimingJitter } from "../_shared/security.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getClientIdentifier, checkServerRateLimit, recordAttempt, rateLimitResponse } from "../_shared/rate-limiting.ts";
import { secureJsonResponse, secureErrorResponse, sanitizeErrorMessage } from "../_shared/security-headers.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SendOTPRequest {
  email: string;
  churchName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, churchName }: SendOTPRequest = await req.json();

    if (!email || !churchName) {
      return secureErrorResponse("Email and church name are required", corsHeaders, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return secureErrorResponse("Invalid email format", corsHeaders, 400);
    }

    // Combined IP + account rate limiting
    const ipIdentifier = getClientIdentifier(req);
    const emailIdentifier = getClientIdentifier(req, email);

    // Check IP-based rate limit (general)
    const ipRateLimit = checkServerRateLimit(ipIdentifier, "otp");
    if (!ipRateLimit.allowed) {
      await addTimingJitter();
      return rateLimitResponse(ipRateLimit.retryAfter!, corsHeaders);
    }

    // Check email-based rate limit (stricter)
    const emailRateLimit = checkServerRateLimit(emailIdentifier, "otp");
    if (!emailRateLimit.allowed) {
      await addTimingJitter();
      return rateLimitResponse(emailRateLimit.retryAfter!, corsHeaders);
    }

    // Record attempts
    recordAttempt(ipIdentifier, "otp");
    recordAttempt(emailIdentifier, "otp");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOTP(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash the OTP before storing
    const hashedOtp = await hashOTP(otp, email);

    // Atomic upsert - if another isolate already inserted for this email,
    // this will update the existing row instead of failing.
    // The LAST writer wins, and only that isolate's email will have the matching OTP.
    const { error: upsertError } = await supabase
      .from("signup_otps")
      .upsert({
        email: email.toLowerCase(),
        otp_code: hashedOtp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      }, { onConflict: 'email' });

    if (upsertError) {
      console.error("Error storing OTP:", upsertError);
      return secureErrorResponse("Failed to generate OTP", corsHeaders, 500);
    }

    // Verify OUR hash is the one stored (another isolate may have overwritten it)
    const { data: storedRecord } = await supabase
      .from("signup_otps")
      .select("otp_code")
      .eq("email", email.toLowerCase())
      .single();

    if (!storedRecord || storedRecord.otp_code !== hashedOtp) {
      // Another isolate overwrote our hash - skip sending email
      // That isolate will send its own email with the matching OTP
      console.log("OTP was overwritten by another isolate, skipping email send");
      return secureJsonResponse({ success: true, message: "Verification code sent successfully" }, corsHeaders);
    }

    // Send OTP email using configured sender or fallback
    const fromAddress = Deno.env.get("RESEND_FROM") || "ChurchFlow <onboarding@resend.dev>";
    
    // Sanitize church name for HTML output
    const safeChurchName = churchName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .substring(0, 100);
    
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: "Verify your email - ChurchFlow",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #18181b; font-size: 24px; margin: 0;">ChurchFlow</h1>
            </div>
            
            <h2 style="color: #18181b; font-size: 20px; text-align: center; margin-bottom: 16px;">
              Verify your email
            </h2>
            
            <p style="color: #52525b; font-size: 16px; line-height: 24px; text-align: center; margin-bottom: 24px;">
              You're creating an account for <strong>${safeChurchName}</strong>. Use the verification code below to complete your registration.
            </p>
            
            <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${otp}</span>
            </div>
            
            <p style="color: #71717a; font-size: 14px; text-align: center; margin-bottom: 0;">
              This code expires in 10 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    // Check if email was sent successfully
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      // Delete the OTP since email failed
      await supabase
        .from("signup_otps")
        .delete()
        .eq("email", email.toLowerCase());
      
      return secureErrorResponse("Failed to send verification email. Please try again later.", corsHeaders, 500);
    }

    return secureJsonResponse({ success: true, message: "Verification code sent successfully" }, corsHeaders);
  } catch (error: any) {
    console.error("Error in send-signup-otp:", error);
    return secureErrorResponse("An error occurred. Please try again.", corsHeaders, 500);
  }
});
