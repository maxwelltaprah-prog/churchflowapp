import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    if (signature) {
      const hash = createHmac("sha512", paystackSecretKey)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await processWebhookEvent(supabase, churchId, event);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
    console.log("Event already processed:", eventId);
    return;
  }

  // Log the event
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
      }
      break;

    default:
      console.log("Unhandled event type:", event.event);
  }
}
