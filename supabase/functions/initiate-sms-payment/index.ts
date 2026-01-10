import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authorizeRequest, authErrorResponse, getServiceClient, corsHeaders } from "../_shared/authorization.ts";
import { safeLog, safeError, getRequiredSecret } from "../_shared/safe-logging.ts";
import { secureErrorResponse, getSecureHeaders } from "../_shared/security-headers.ts";

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

    // SECURE: Fail fast if secrets are missing
    const hubtelClientId = getRequiredSecret("HUBTEL_CLIENT_ID");
    const hubtelClientSecret = getRequiredSecret("HUBTEL_CLIENT_SECRET");

    const supabase = getServiceClient();

    const { credits, amount, returnUrl, customerPhone, customerName } = await req.json();

    // SAFE: Log without sensitive data
    safeLog("Initiating SMS credit payment", { churchId, credits, amount });

    if (!credits || !amount) {
      return secureErrorResponse("Missing required fields", corsHeaders, 400);
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

    if (purchaseError) {
      safeError("Failed to create purchase record", purchaseError);
      return secureErrorResponse("Failed to initiate payment", corsHeaders, 500);
    }

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

    // SAFE: Log without customer phone/name
    safeLog("Creating Hubtel checkout", { 
      amount, 
      credits, 
      clientReference,
      hasPhone: !!customerPhone 
    });

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
    
    // SAFE: Log status only, not raw response
    safeLog("Hubtel API response", { 
      status: checkoutResponse.status,
      ok: checkoutResponse.ok 
    });

    let checkoutResult: any = {};
    if (responseText) {
      try {
        checkoutResult = JSON.parse(responseText);
      } catch (parseError) {
        safeError("Failed to parse Hubtel response");
        return secureErrorResponse("Payment provider error", corsHeaders, 500);
      }
    }

    if (!checkoutResponse.ok) {
      // Update purchase as failed
      await supabase
        .from("sms_credit_purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id);

      safeError("Hubtel checkout failed", { status: checkoutResponse.status });
      return secureErrorResponse("Payment initiation failed", corsHeaders, 500);
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
      { headers: getSecureHeaders(corsHeaders) }
    );
  } catch (error: unknown) {
    safeError("Payment Initiation Error", error);
    return secureErrorResponse("An unexpected error occurred", corsHeaders, 500);
  }
});
