import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPhoneRequest {
  phone: string;
  action: "login" | "create_pin";
}

interface VerifyPhoneResponse {
  success: boolean;
  error?: string;
  member_name?: string;
  has_account?: boolean;
  approval_status?: string;
  member_id?: string;
  member_phone?: string;
}

// Normalize phone number for comparison
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // Convert Ghana country code to local format
  if (digits.startsWith("233") && digits.length >= 12) {
    digits = "0" + digits.slice(3);
  }
  return digits;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS for phone verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, action }: VerifyPhoneRequest = await req.json();

    if (!phone || phone.length < 9) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone number" } as VerifyPhoneResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!action || !["login", "create_pin"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" } as VerifyPhoneResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedInputPhone = normalizePhone(phone);

    // Query members by normalized phone - only fetch what's needed server-side
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, phone, approval_status, user_id, is_active")
      .eq("is_active", true);

    if (memberError) {
      console.error("Database error:", memberError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error" } as VerifyPhoneResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find matching member by normalized phone
    const matchedMember = members?.find((m) => {
      const memberPhone = normalizePhone(m.phone || "");
      return (
        memberPhone === normalizedInputPhone ||
        memberPhone.endsWith(normalizedInputPhone) ||
        normalizedInputPhone.endsWith(memberPhone)
      );
    });

    if (!matchedMember) {
      // Generic error message to prevent enumeration
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: action === "login" 
            ? "Invalid credentials" 
            : "No member found with this phone number. Please contact your church administrator."
        } as VerifyPhoneResponse),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check approval status
    if (matchedMember.approval_status === "pending") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Your membership is still pending approval. Please wait for an administrator to approve your registration.",
          approval_status: "pending"
        } as VerifyPhoneResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (matchedMember.approval_status === "rejected") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Your membership application was not approved. Please contact your church administrator.",
          approval_status: "rejected"
        } as VerifyPhoneResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasAccount = !!matchedMember.user_id;

    if (action === "login") {
      // For login: require existing account
      if (!hasAccount) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Your account is not fully set up. Please create your PIN first.",
            has_account: false
          } as VerifyPhoneResponse),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return limited info needed for login
      return new Response(
        JSON.stringify({ 
          success: true, 
          member_name: matchedMember.full_name,
          has_account: true,
          member_phone: matchedMember.phone
        } as VerifyPhoneResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create_pin") {
      // For PIN creation: require NO existing account
      if (hasAccount) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "You already have an account. Please use the Sign In page instead.",
            has_account: true
          } as VerifyPhoneResponse),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return info needed for PIN creation
      return new Response(
        JSON.stringify({ 
          success: true, 
          member_name: matchedMember.full_name,
          member_id: matchedMember.id,
          member_phone: matchedMember.phone,
          has_account: false
        } as VerifyPhoneResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" } as VerifyPhoneResponse),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-member-phone:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" } as VerifyPhoneResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
