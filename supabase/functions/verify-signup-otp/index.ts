import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOTP, addTimingJitter } from "../_shared/security.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getClientIdentifier, checkServerRateLimit, recordAttempt, clearServerRateLimit, rateLimitResponse } from "../_shared/rate-limiting.ts";
import { secureJsonResponse, secureErrorResponse } from "../_shared/security-headers.ts";

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, otp }: VerifyOTPRequest = await req.json();

    if (!email || !otp) {
      return secureErrorResponse("Email and OTP are required", corsHeaders, 400);
    }

    // Validate OTP format (must be exactly 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return secureErrorResponse("Invalid verification code format", corsHeaders, 400);
    }

    // Combined IP + account rate limiting
    const ipIdentifier = getClientIdentifier(req);
    const emailIdentifier = getClientIdentifier(req, email);

    // Check IP-based rate limit
    const ipRateLimit = checkServerRateLimit(ipIdentifier, "otp");
    if (!ipRateLimit.allowed) {
      await addTimingJitter();
      return rateLimitResponse(ipRateLimit.retryAfter!, corsHeaders);
    }

    // Check email-based rate limit (stricter for OTP verification)
    const emailRateLimit = checkServerRateLimit(emailIdentifier, "otp");
    if (!emailRateLimit.allowed) {
      await addTimingJitter();
      return rateLimitResponse(emailRateLimit.retryAfter!, corsHeaders);
    }

    // Record attempt (before checking to count all attempts)
    recordAttempt(ipIdentifier, "otp");
    recordAttempt(emailIdentifier, "otp");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("signup_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return secureErrorResponse("Failed to verify OTP", corsHeaders, 500);
    }

    // Add timing jitter to prevent timing attacks
    await addTimingJitter();

    if (!otpRecord) {
      return secureJsonResponse({ error: "Invalid verification code", valid: false }, corsHeaders, 400);
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Delete expired OTP
      await supabase.from("signup_otps").delete().eq("id", otpRecord.id);
      
      return secureJsonResponse({ error: "Verification code has expired", valid: false }, corsHeaders, 400);
    }

    // Verify the OTP hash
    const isValidOTP = await verifyOTP(otp, otpRecord.otp_code, email);
    
    if (!isValidOTP) {
      const remaining = emailRateLimit.remaining ?? 0;
      return secureJsonResponse({ 
        error: "Invalid verification code", 
        valid: false,
        attemptsRemaining: remaining
      }, corsHeaders, 400);
    }

    // Mark as verified (we'll keep the record briefly for the account creation step)
    const { error: updateError } = await supabase
      .from("signup_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
    }

    // Clear rate limit on success
    clearServerRateLimit(emailIdentifier);

    return secureJsonResponse({ valid: true, message: "Email verified successfully" }, corsHeaders);
  } catch (error: any) {
    console.error("Error in verify-signup-otp:", error);
    return secureErrorResponse("An error occurred. Please try again.", corsHeaders, 500);
  }
});
