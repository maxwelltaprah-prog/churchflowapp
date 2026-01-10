import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSecureOTP, hashOTP, addTimingJitter } from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendResetOTPRequest {
  email: string;
}

// In-memory rate limiting (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // Max 3 requests per minute per email

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitMap.get(key);
  
  if (!record || (now - record.firstAttempt) > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, firstAttempt: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count += 1;
  return true;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendResetOTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(email)) {
      // Add timing jitter to prevent timing attacks
      await addTimingJitter();
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset code has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error checking user:", userError);
      // Add timing jitter before returning
      await addTimingJitter();
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset code has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userExists = userData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!userExists) {
      // Add timing jitter to match successful case timing
      await addTimingJitter(200, 400);
      // Don't reveal that user doesn't exist for security
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset code has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOTP(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash the OTP before storing (use email as salt)
    const hashedOtp = await hashOTP(otp, email);

    // Delete any existing reset OTP for this email
    await supabase
      .from("password_reset_otps")
      .delete()
      .eq("email", email.toLowerCase());

    // Insert new hashed OTP
    const { error: insertError } = await supabase
      .from("password_reset_otps")
      .insert({
        email: email.toLowerCase(),
        otp_code: hashedOtp, // Store hashed, not plain text
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate reset code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP email (send plain OTP to user, store hash)
    const fromAddress = Deno.env.get("RESEND_FROM") || "ChurchFlow <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: "Reset your password - ChurchFlow",
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
              Reset your password
            </h2>
            
            <p style="color: #52525b; font-size: 16px; line-height: 24px; text-align: center; margin-bottom: 24px;">
              We received a request to reset your password. Use the verification code below to proceed.
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
        .from("password_reset_otps")
        .delete()
        .eq("email", email.toLowerCase());
      
      return new Response(
        JSON.stringify({ error: "Failed to send reset email. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Reset code sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset-otp:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});