import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOTP, addTimingJitter } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
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
    const { email, otp }: VerifyOTPRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
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
      .from("signup_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Add timing jitter to prevent timing attacks
    await addTimingJitter();

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code", valid: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Delete expired OTP
      await supabase.from("signup_otps").delete().eq("id", otpRecord.id);
      
      return new Response(
        JSON.stringify({ error: "Verification code has expired", valid: false }),
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

    // Mark as verified (we'll keep the record briefly for the account creation step)
    const { error: updateError } = await supabase
      .from("signup_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
    }

    // Clear rate limit on success
    clearVerifyRateLimit(email);

    return new Response(
      JSON.stringify({ valid: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-signup-otp:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
