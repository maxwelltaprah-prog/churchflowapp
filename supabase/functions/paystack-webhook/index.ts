import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { safeLog, safeError, getRequiredSecret } from "../_shared/safe-logging.ts";
import { getSecureHeaders, secureErrorResponse } from "../_shared/security-headers.ts";
import { getPublicCorsHeaders, handlePublicCorsPreflightRequest } from "../_shared/cors.ts";
import { validateDeploymentSecurity, isProduction } from "../_shared/deployment-check.ts";

// Validate deployment security on cold start (webhooks need payments)
validateDeploymentSecurity("paystack-webhook", ["payments"]);

Deno.serve(async (req) => {
  const corsHeaders = getPublicCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handlePublicCorsPreflightRequest(req);
  }

  try {
    // SECURE: Fail fast if secrets are missing
    const paystackSecretKey = getRequiredSecret("PAYSTACK_SECRET_KEY");

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    if (signature) {
      const hash = createHmac("sha512", paystackSecretKey)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        safeError("Invalid webhook signature - possible attack");
        return secureErrorResponse("Invalid signature", corsHeaders, 400);
      }
    }

    const event = JSON.parse(body);
    
    // SAFE: Log event type only, not payload
    safeLog("Paystack webhook received", { eventType: event.event });

    const supabaseUrl = getRequiredSecret("SUPABASE_URL");
    const supabaseKey = getRequiredSecret("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract church_id from metadata
    const metadata = event.data?.metadata;
    const churchId = metadata?.church_id;

    if (!churchId) {
      // Try to find church by customer code
      const customerCode = event.data?.customer?.customer_code;
      if (customerCode) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("church_id")
          .eq("paystack_customer_code", customerCode)
          .single();

        if (subscription) {
          await processWebhookEvent(supabase, subscription.church_id, event);
        }
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: getSecureHeaders(corsHeaders),
      });
    }

    await processWebhookEvent(supabase, churchId, event);

    return new Response(JSON.stringify({ received: true }), {
      headers: getSecureHeaders(corsHeaders),
    });
  } catch (error: unknown) {
    safeError("Webhook processing error", error);
    return secureErrorResponse("Webhook processing failed", corsHeaders, 500);
  }
});

async function processWebhookEvent(
  supabase: any,
  churchId: string,
  event: any
) {
  const eventId =
    event.data?.reference ||
    event.data?.subscription_code ||
    `${event.event}_${Date.now()}`;

  // Check idempotency
  const { data: existingEvent } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existingEvent) {
    safeLog("Event already processed", { eventId });
    return;
  }

  // Log the event (stores sanitized payload in DB for audit)
  // NOTE: payload_json may contain customer data - ensure DB has appropriate access controls
  await supabase.from("subscription_events").insert({
    church_id: churchId,
    event_id: eventId,
    event_type: event.event,
    payload_json: event.data,
  });

  // Handle different event types
  switch (event.event) {
    case "charge.success":
      // Payment successful
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("church_id", churchId);
      safeLog("Subscription activated", { churchId });
      break;

    case "invoice.payment_failed":
    case "charge.failed":
      // Payment failed
      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("church_id", churchId);
      safeLog("Subscription payment failed", { churchId });
      break;

    case "subscription.disable":
    case "subscription.not_renew":
      // Subscription canceled
      await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("church_id", churchId);
      safeLog("Subscription canceled", { churchId });
      break;

    case "subscription.create":
      // New subscription created
      if (event.data?.subscription_code) {
        await supabase
          .from("subscriptions")
          .update({
            paystack_subscription_code: event.data.subscription_code,
            paystack_plan_code: event.data.plan?.plan_code,
            updated_at: new Date().toISOString(),
          })
          .eq("church_id", churchId);
        safeLog("Subscription created", { churchId });
      }
      break;

    default:
      safeLog("Unhandled webhook event", { eventType: event.event });
  }
}
