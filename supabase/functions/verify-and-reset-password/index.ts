import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOTP, addTimingJitter } from "../_shared/security.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getClientIdentifier, checkServerRateLimit, recordAttempt, clearServerRateLimit, rateLimitResponse } from "../_shared/rate-limiting.ts";
import { secureJsonResponse, secureErrorResponse } from "../_shared/security-headers.ts";

interface VerifyAndResetRequest {
  email: string;
  otp: string;
  newPassword: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, otp, newPassword }: VerifyAndResetRequest = await req.json();

    if (!email || !otp || !newPassword) {
      return secureErrorResponse("Email, OTP, and new password are required", corsHeaders, 400);
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return secureErrorResponse("Invalid verification code format", corsHeaders, 400);
    }

    if (newPassword.length < 6) {
      return secureErrorResponse("Password must be at least 6 characters", corsHeaders, 400);
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

    // Check email-based rate limit
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

    // Find OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return secureErrorResponse("Failed to verify code", corsHeaders, 500);
    }

    // Add timing jitter to prevent timing attacks on OTP existence
    await addTimingJitter();

    if (!otpRecord) {
      return secureJsonResponse({ error: "Invalid verification code", valid: false }, corsHeaders, 400);
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("password_reset_otps").delete().eq("id", otpRecord.id);
      
      return secureJsonResponse({ error: "Verification code has expired", valid: false }, corsHeaders, 400);
    }

    // Check if already used
    if (otpRecord.used) {
      return secureJsonResponse({ error: "This code has already been used", valid: false }, corsHeaders, 400);
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

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error finding user:", userError);
      return secureErrorResponse("Failed to reset password", corsHeaders, 500);
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return secureErrorResponse("User not found", corsHeaders, 404);
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return secureErrorResponse("Failed to update password", corsHeaders, 500);
    }

    // Delete OTP after successful use (single-use enforcement)
    await supabase.from("password_reset_otps").delete().eq("id", otpRecord.id);
    
    // Clear rate limit on success
    clearServerRateLimit(emailIdentifier);

    return secureJsonResponse({ success: true, message: "Password reset successfully" }, corsHeaders);
  } catch (error: any) {
    console.error("Error in verify-and-reset-password:", error);
    return secureErrorResponse("An error occurred. Please try again.", corsHeaders, 500);
  }
});
