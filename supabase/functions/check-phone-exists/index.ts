import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckPhoneRequest {
  phone: string;
  church_id: string;
}

interface CheckPhoneResponse {
  exists: boolean;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, church_id }: CheckPhoneRequest = await req.json();

    if (!phone || phone.length < 9) {
      return new Response(
        JSON.stringify({ exists: false, error: "Invalid phone number" } as CheckPhoneResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!church_id) {
      return new Response(
        JSON.stringify({ exists: false, error: "Church ID required" } as CheckPhoneResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if phone exists in this church (exact match only for registration)
    const { data: existingMember, error } = await supabase
      .from("members")
      .select("id")
      .eq("phone", phone.trim())
      .eq("church_id", church_id)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ exists: false, error: "Database error" } as CheckPhoneResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ exists: !!existingMember } as CheckPhoneResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-phone-exists:", error);
    return new Response(
      JSON.stringify({ exists: false, error: "Internal server error" } as CheckPhoneResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
