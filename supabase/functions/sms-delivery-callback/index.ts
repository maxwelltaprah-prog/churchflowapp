import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPublicCorsHeaders, handlePublicCorsPreflightRequest } from "../_shared/cors.ts";
import { checkServerRateLimit, recordAttempt, rateLimitResponse, getClientIdentifier } from "../_shared/rate-limiting.ts";
import { safeLog } from "../_shared/safe-logging.ts";

serve(async (req) => {
  // Handle CORS preflight for webhook endpoints
  if (req.method === "OPTIONS") {
    return handlePublicCorsPreflightRequest(req);
  }

  const corsHeaders = getPublicCorsHeaders(req);

  try {
    // Rate limiting to prevent DoS attacks
    const clientIP = getClientIdentifier(req);
    const rateLimitResult = checkServerRateLimit(clientIP, "general");
    
    if (!rateLimitResult.allowed) {
      safeLog("warn", "SMS delivery callback rate limited", { ip: clientIP });
      return rateLimitResponse(rateLimitResult.retryAfter || 300, corsHeaders);
    }
    
    recordAttempt(clientIP, "general");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SMSOnlineGH sends delivery reports via GET with query params
    const url = new URL(req.url);
    
    // Parse delivery report parameters (common SMS API format)
    const messageId = url.searchParams.get("msgid") || url.searchParams.get("id");
    const status = url.searchParams.get("status") || url.searchParams.get("dlr_status");
    const statusCode = url.searchParams.get("status_code") || url.searchParams.get("dlrstat");

    // Redact phone from logs
    safeLog("info", "Received delivery callback", { messageId, status, statusCode });

    if (!messageId) {
      safeLog("info", "No message ID in callback, checking POST body");
      
      // Try parsing as JSON POST body (some providers use POST)
      if (req.method === "POST") {
        try {
          const body = await req.json();
          safeLog("info", "POST body received", { hasBody: !!body });
          
          const msgId = body.msgId || body.message_id || body.id;
          const dlrStatus = body.status || body.event || body.dlr_status;
          
          if (msgId) {
            // Validate messageId exists before updating
            const updated = await updateDeliveryStatus(supabase, msgId, dlrStatus);
            if (!updated) {
              return new Response(JSON.stringify({ error: "Invalid message ID" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          safeLog("warn", "Failed to parse POST body", { error: e instanceof Error ? e.message : "Unknown" });
        }
      }
      
      return new Response(JSON.stringify({ error: "No message ID provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate messageId exists before updating
    const updated = await updateDeliveryStatus(supabase, messageId, status || statusCode);
    if (!updated) {
      return new Response(JSON.stringify({ error: "Invalid message ID" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    safeLog("error", "Delivery callback error", { error: errorMessage });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function updateDeliveryStatus(
  supabase: any,
  messageId: string,
  status: string | null
): Promise<boolean> {
  // Validate messageId format (basic sanitization)
  if (!messageId || typeof messageId !== "string" || messageId.length > 255) {
    safeLog("warn", "Invalid message ID format", { length: messageId?.length });
    return false;
  }

  // First verify the message exists in our database
  const { data: existingJob, error: checkError } = await supabase
    .from("sms_jobs")
    .select("id")
    .eq("provider_message_id", messageId)
    .maybeSingle();

  if (checkError) {
    safeLog("error", "Failed to check message existence", { error: checkError.message });
    return false;
  }

  if (!existingJob) {
    safeLog("warn", "Message ID not found in database");
    return false;
  }

  // Map common status codes to delivery status
  const deliveryStatus = mapStatusToDeliveryStatus(status);
  
  safeLog("info", "Updating message status", { deliveryStatus });

  const { data, error } = await supabase
    .from("sms_jobs")
    .update({
      delivery_status: deliveryStatus,
      delivered_at: deliveryStatus === "delivered" ? new Date().toISOString() : null,
    })
    .eq("provider_message_id", messageId)
    .select();

  if (error) {
    safeLog("error", "Failed to update delivery status", { error: error.message });
    return false;
  }

  safeLog("info", "Updated records", { count: data?.length || 0 });
  return true;
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
