import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authorizeRequest, authErrorResponse, getServiceClient, corsHeaders } from "../_shared/authorization.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Authorize request and derive churchId from authenticated user
    const authResult = await authorizeRequest(req, {
      requireRole: ["church_admin", "branch_admin"], // Only admins can initiate payments
    });

    if (!authResult.success) {
      return authErrorResponse(authResult.error!, authResult.status!);
    }

    const authorizedUser = authResult.user!;
    const churchId = authorizedUser.churchId; // SECURE: Derived from auth, not request body
    const userId = authorizedUser.userId; // SECURE: Derived from auth, not request body

    const hubtelClientId = Deno.env.get("HUBTEL_CLIENT_ID");
    const hubtelClientSecret = Deno.env.get("HUBTEL_CLIENT_SECRET");

    if (!hubtelClientId || !hubtelClientSecret) {
      throw new Error("Hubtel API credentials not configured");
    }

    const supabase = getServiceClient();

    const { credits, amount, returnUrl, customerPhone, customerName } = await req.json();

    console.log("Initiating SMS credit payment:", { churchId, credits, amount });

    if (!credits || !amount) {
      throw new Error("Missing required fields: credits, amount");
    }

    // Generate unique reference
    const clientReference = `sms-${churchId.slice(0, 8)}-${Date.now()}`;

    // Create pending purchase record with SECURE derived values
    const { data: purchase, error: purchaseError } = await supabase
      .from("sms_credit_purchases")
      .insert({
        church_id: churchId, // SECURE: Uses derived churchId
        admin_user_id: userId, // SECURE: Uses authenticated userId
        credits_purchased: credits,
        amount_paid: amount,
        currency: "GHS",
        status: "pending",
        hubtel_reference: clientReference,
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Get Hubtel auth header
    const getHubtelAuthHeader = () => {
      const credentials = btoa(`${hubtelClientId}:${hubtelClientSecret}`);
      return `Basic ${credentials}`;
    };

    // Create Hubtel checkout order
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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

    const responseText = await checkoutResponse.text();
    console.log("Hubtel raw response:", responseText, "Status:", checkoutResponse.status);

    let checkoutResult: any = {};
    if (responseText) {
      try {
        checkoutResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse Hubtel response:", parseError);
        throw new Error(`Hubtel API returned invalid response: ${responseText.substring(0, 200)}`);
      }
    }

    console.log("Hubtel checkout response:", JSON.stringify(checkoutResult));

    if (!checkoutResponse.ok) {
      // Update purchase as failed
      await supabase
        .from("sms_credit_purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id);

      throw new Error(checkoutResult.message || checkoutResult.Message || `Hubtel API error (${checkoutResponse.status})`);
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
