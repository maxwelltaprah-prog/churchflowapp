import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { secureJsonResponse, secureErrorResponse } from "../_shared/security-headers.ts";
import { validateDeploymentSecurity } from "../_shared/deployment-check.ts";
import { getClientIdentifier, checkServerRateLimit, recordAttempt, rateLimitResponse } from "../_shared/rate-limiting.ts";

// Validate deployment security on cold start
validateDeploymentSecurity("paystack-verify", ["payments"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Rate limiting for payment endpoints
    const ipIdentifier = getClientIdentifier(req);
    const rateLimit = checkServerRateLimit(ipIdentifier, "payment");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    recordAttempt(ipIdentifier, "payment");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureErrorResponse("Unauthorized", corsHeaders, 401);
    }

    const { reference } = await req.json();
    if (!reference) {
      return secureErrorResponse("No reference provided", corsHeaders, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      return secureErrorResponse("Payment service not configured", corsHeaders, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return secureErrorResponse("Invalid user", corsHeaders, 401);
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    if (!profile?.church_id) {
      return secureErrorResponse("User profile not found", corsHeaders, 404);
    }

    // Verify transaction with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return secureErrorResponse("Payment verification failed", corsHeaders, 400);
    }

    const metadata = verifyData.data.metadata;
    const churchId = metadata?.church_id;

    // Verify this payment belongs to the user's church
    if (churchId !== profile.church_id) {
      return secureErrorResponse("Payment does not belong to this church", corsHeaders, 403);
    }

    // Check for idempotency - don't process same reference twice
    const { data: existingEvent } = await supabase
      .from("subscription_events")
      .select("id")
      .eq("event_id", reference)
      .single();

    if (existingEvent) {
      // Already processed, just return success
      return secureJsonResponse(
        { success: true, message: "Payment already processed" },
        corsHeaders
      );
    }

    // Log the event
    await supabase.from("subscription_events").insert({
      church_id: churchId,
      event_id: reference,
      event_type: "payment.success",
      payload_json: verifyData.data,
    });

    // Update subscription to active
    const normalAmountGhs = metadata?.normal_amount_ghs || 99;

    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        locked_at: null,
        current_amount_ghs: normalAmountGhs,
        first_payment_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("church_id", churchId);

    // Now create a recurring subscription for future payments
    // First, create or get a plan for the normal amount
    const planName = `ChurchFlow_GHS${normalAmountGhs}_monthly`;
    const planAmountPesewas = normalAmountGhs * 100;

    // Check if plan exists
    let planCode: string | null = null;

    const plansRes = await fetch("https://api.paystack.co/plan", {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const plansData = await plansRes.json();
    if (plansData.status) {
      const existingPlan = plansData.data.find(
        (p: any) =>
          p.name === planName && p.amount === planAmountPesewas && !p.is_deleted
      );
      if (existingPlan) {
        planCode = existingPlan.plan_code;
      }
    }

    // Create plan if it doesn't exist
    if (!planCode) {
      const createPlanRes = await fetch("https://api.paystack.co/plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: planName,
          interval: "monthly",
          amount: planAmountPesewas,
          currency: "GHS",
        }),
      });

      const createPlanData = await createPlanRes.json();
      if (createPlanData.status) {
        planCode = createPlanData.data.plan_code;
      }
    }

    // Get subscription record for customer code
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("paystack_customer_code, paystack_email")
      .eq("church_id", churchId)
      .single();

    // Create subscription for recurring billing (starting next month)
    if (planCode && subscription?.paystack_customer_code) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      startDate.setDate(1); // Start on 1st of next month

      const subscriptionRes = await fetch(
        "https://api.paystack.co/subscription",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: subscription.paystack_customer_code,
            plan: planCode,
            start_date: startDate.toISOString(),
          }),
        }
      );

      const subscriptionData = await subscriptionRes.json();
      if (subscriptionData.status) {
        await supabase
          .from("subscriptions")
          .update({
            paystack_plan_code: planCode,
            paystack_subscription_code: subscriptionData.data.subscription_code,
            updated_at: new Date().toISOString(),
          })
          .eq("church_id", churchId);
      }
    }

    return secureJsonResponse(
      {
        success: true,
        message: "Payment verified and subscription activated",
      },
      corsHeaders
    );
  } catch (error: unknown) {
    console.error("Verify error:", error);
    return secureErrorResponse("Verification failed", corsHeaders, 400);
  }
});
