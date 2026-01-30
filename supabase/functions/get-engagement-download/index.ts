import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify auth
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { attachmentId } = await req.json();
    if (!attachmentId) {
      return new Response(
        JSON.stringify({ error: "attachmentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to access storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get attachment record
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from("engagement_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !attachment) {
      console.error("Attachment not found:", attachmentError);
      return new Response(
        JSON.stringify({ error: "Attachment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (attachment.is_expired || new Date(attachment.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Attachment has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this church (either staff or member)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("church_id")
      .eq("user_id", user.id)
      .single();

    const userChurchId = profile?.church_id || member?.church_id;
    
    if (userChurchId !== attachment.church_id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (72 hours = 259200 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from("engagement-content")
      .createSignedUrl(attachment.storage_path, 259200, {
        download: attachment.file_name,
      });

    if (signedUrlError) {
      console.error("Error generating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        expiresAt: attachment.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
