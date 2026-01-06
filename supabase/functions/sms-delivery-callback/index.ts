import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SMSOnlineGH sends delivery reports via GET with query params
    const url = new URL(req.url);
    
    // Parse delivery report parameters (common SMS API format)
    const messageId = url.searchParams.get("msgid") || url.searchParams.get("id");
    const status = url.searchParams.get("status") || url.searchParams.get("dlr_status");
    const statusCode = url.searchParams.get("status_code") || url.searchParams.get("dlrstat");
    const phone = url.searchParams.get("to") || url.searchParams.get("destination");

    console.log("Received delivery callback:", { messageId, status, statusCode, phone });

    if (!messageId) {
      console.log("No message ID in callback, checking POST body");
      
      // Try parsing as JSON POST body (some providers use POST)
      if (req.method === "POST") {
        try {
          const body = await req.json();
          console.log("POST body:", JSON.stringify(body));
          
          const msgId = body.msgId || body.message_id || body.id;
          const dlrStatus = body.status || body.event || body.dlr_status;
          
          if (msgId) {
            await updateDeliveryStatus(supabase, msgId, dlrStatus);
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.log("Failed to parse POST body:", e);
        }
      }
      
      return new Response(JSON.stringify({ error: "No message ID provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await updateDeliveryStatus(supabase, messageId, status || statusCode);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Delivery callback error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function updateDeliveryStatus(
  supabase: any,
  messageId: string,
  status: string | null
) {
  // Map common status codes to delivery status
  const deliveryStatus = mapStatusToDeliveryStatus(status);
  
  console.log(`Updating message ${messageId} to status: ${deliveryStatus}`);

  const { data, error } = await supabase
    .from("sms_jobs")
    .update({
      delivery_status: deliveryStatus,
      delivered_at: deliveryStatus === "delivered" ? new Date().toISOString() : null,
    })
    .eq("provider_message_id", messageId)
    .select();

  if (error) {
    console.error("Failed to update delivery status:", error);
    throw error;
  }

  console.log(`Updated ${data?.length || 0} records`);
  return data;
}

function mapStatusToDeliveryStatus(status: string | null): string {
  if (!status) return "unknown";
  
  const statusLower = status.toLowerCase();
  
  // Common delivery status mappings
  if (statusLower.includes("deliver") || statusLower === "1" || statusLower === "ok") {
    return "delivered";
  }
  if (statusLower.includes("fail") || statusLower.includes("reject") || statusLower === "2") {
    return "failed";
  }
  if (statusLower.includes("pend") || statusLower === "0" || statusLower.includes("queue")) {
    return "pending";
  }
  if (statusLower.includes("sent") || statusLower.includes("submit")) {
    return "sent";
  }
  if (statusLower.includes("expire")) {
    return "expired";
  }
  if (statusLower.includes("undeliver")) {
    return "undelivered";
  }
  
  return status;
}
