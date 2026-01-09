import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendResetOTPRequest {
  email: string;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error checking user:", userError);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset code has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userExists = userData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!userExists) {
      // Don't reveal that user doesn't exist for security
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset code has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing reset OTP for this email
    await supabase
      .from("password_reset_otps")
      .delete()
      .eq("email", email.toLowerCase());

    // Insert new OTP
    const { error: insertError } = await supabase
      .from("password_reset_otps")
      .insert({
        email: email.toLowerCase(),
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate reset code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP email
    // NOTE: Resend requires a verified sending domain for custom FROM addresses.
    // We default to Resend's testing domain unless you configure RESEND_FROM.
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

    console.log("Reset OTP email response:", emailResponse);

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
      JSON.stringify({ error: error.message || "Failed to send reset code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
