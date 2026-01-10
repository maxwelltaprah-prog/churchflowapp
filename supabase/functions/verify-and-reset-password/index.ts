import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOTP, addTimingJitter } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyAndResetRequest {
  email: string;
  otp: string;
  newPassword: string;
}

// In-memory rate limiting for OTP verification attempts
const verifyAttempts = new Map<string, { count: number; firstAttempt: number }>();
const VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const VERIFY_MAX_ATTEMPTS = 5; // Max 5 attempts per 15 minutes

function checkVerifyRateLimit(email: string): { allowed: boolean; attemptsRemaining: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = verifyAttempts.get(key);
  
  if (!record || (now - record.firstAttempt) > VERIFY_WINDOW_MS) {
    verifyAttempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, attemptsRemaining: VERIFY_MAX_ATTEMPTS - 1 };
  }
  
  if (record.count >= VERIFY_MAX_ATTEMPTS) {
    return { allowed: false, attemptsRemaining: 0 };
  }
  
  record.count += 1;
  return { allowed: true, attemptsRemaining: VERIFY_MAX_ATTEMPTS - record.count };
}

function clearVerifyRateLimit(email: string): void {
  verifyAttempts.delete(email.toLowerCase());
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, newPassword }: VerifyAndResetRequest = await req.json();

    if (!email || !otp || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email, OTP, and new password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check rate limit for verification attempts
    const { allowed, attemptsRemaining } = checkVerifyRateLimit(email);
    if (!allowed) {
      await addTimingJitter();
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Add timing jitter to prevent timing attacks on OTP existence
    await addTimingJitter();

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code", valid: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("password_reset_otps").delete().eq("id", otpRecord.id);
      
      return new Response(
        JSON.stringify({ error: "Verification code has expired", valid: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already used
    if (otpRecord.used) {
      return new Response(
        JSON.stringify({ error: "This code has already been used", valid: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the OTP hash
    const isValidOTP = await verifyOTP(otp, otpRecord.otp_code, email);
    
    if (!isValidOTP) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid verification code", 
          valid: false,
          attemptsRemaining 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error finding user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to reset password" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete OTP after successful use (single-use enforcement)
    await supabase.from("password_reset_otps").delete().eq("id", otpRecord.id);
    
    // Clear rate limit on success
    clearVerifyRateLimit(email);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-and-reset-password:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});