import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of expired service uploads...");

    // Find expired uploads
    const { data: expiredUploads, error: fetchError } = await supabase
      .from("service_uploads")
      .select("id, storage_path, service_id")
      .or(`expires_at.lt.${new Date().toISOString()},is_expired.eq.true`)
      .eq("is_expired", false);

    if (fetchError) {
      console.error("Error fetching expired uploads:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredUploads?.length || 0} expired uploads to clean up`);

    if (!expiredUploads || expiredUploads.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired uploads to clean up", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let deletedCount = 0;
    let errorCount = 0;

    for (const upload of expiredUploads) {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from("service-uploads")
          .remove([upload.storage_path]);

        if (storageError) {
          console.error(`Error deleting file ${upload.storage_path}:`, storageError);
          // Continue anyway to mark as expired
        }

        // Mark as expired in database
        const { error: updateError } = await supabase
          .from("service_uploads")
          .update({ is_expired: true })
          .eq("id", upload.id);

        if (updateError) {
          console.error(`Error marking upload ${upload.id} as expired:`, updateError);
          errorCount++;
        } else {
          deletedCount++;
          console.log(`Cleaned up upload: ${upload.id}`);
        }
      } catch (err) {
        console.error(`Error processing upload ${upload.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Cleanup complete: ${deletedCount} deleted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: "Cleanup complete",
        deleted: deletedCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
