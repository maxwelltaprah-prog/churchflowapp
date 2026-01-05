import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encode credentials for Hubtel Basic Auth
function getHubtelAuthHeader(): string {
  const clientId = Deno.env.get("HUBTEL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("HUBTEL_CLIENT_SECRET")!;
  const credentials = `${clientId}:${clientSecret}`;
  return `Basic ${btoa(credentials)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hubtelClientId = Deno.env.get("HUBTEL_CLIENT_ID");
    const hubtelClientSecret = Deno.env.get("HUBTEL_CLIENT_SECRET");

    if (!hubtelClientId || !hubtelClientSecret) {
      throw new Error("Hubtel API credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { churchId, userId, credits, amount, returnUrl, customerPhone, customerName } = await req.json();

    console.log("Initiating SMS credit payment:", { churchId, credits, amount });

    if (!churchId || !userId || !credits || !amount) {
      throw new Error("Missing required fields: churchId, userId, credits, amount");
    }

    // Generate unique reference
    const clientReference = `sms-${churchId.slice(0, 8)}-${Date.now()}`;

    // Create pending purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("sms_credit_purchases")
      .insert({
        church_id: churchId,
        admin_user_id: userId,
        credits_purchased: credits,
        amount_paid: amount,
        currency: "GHS",
        status: "pending",
        hubtel_reference: clientReference,
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Create Hubtel checkout order
    const callbackUrl = `${supabaseUrl}/functions/v1/hubtel-payment-callback`;
    
    const checkoutPayload = {
      totalAmount: amount,
      description: `Purchase of ${credits} SMS credits`,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl || `${supabaseUrl.replace('supabase.co', 'lovable.app')}/app/sms`,
      cancellationUrl: returnUrl || `${supabaseUrl.replace('supabase.co', 'lovable.app')}/app/sms`,
      merchantAccountNumber: hubtelClientId,
      clientReference: clientReference,
      customerPhoneNumber: customerPhone || "",
      customerName: customerName || "Church Admin",
    };

    console.log("Creating Hubtel checkout:", checkoutPayload);

    const checkoutResponse = await fetch(
      "https://payproxyapi.hubtel.com/items/initiate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getHubtelAuthHeader(),
        },
        body: JSON.stringify(checkoutPayload),
      }
    );

    const checkoutResult = await checkoutResponse.json();
    console.log("Hubtel checkout response:", JSON.stringify(checkoutResult));

    if (!checkoutResponse.ok) {
      // Update purchase as failed
      await supabase
        .from("sms_credit_purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id);

      throw new Error(checkoutResult.message || checkoutResult.Message || "Failed to create checkout");
    }

    // Update purchase with checkout ID
    if (checkoutResult.data?.checkoutId) {
      await supabase
        .from("sms_credit_purchases")
        .update({ hubtel_checkout_id: checkoutResult.data.checkoutId })
        .eq("id", purchase.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        checkoutUrl: checkoutResult.data?.checkoutUrl || checkoutResult.data?.checkoutDirectUrl,
        clientReference: clientReference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment Initiation Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
