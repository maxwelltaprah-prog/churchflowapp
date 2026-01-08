import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { reference } = await req.json();
    if (!reference) {
      throw new Error("No reference provided");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    if (!profile?.church_id) {
      throw new Error("User profile not found");
    }

    // Verify transaction with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      throw new Error("Payment verification failed");
    }

    const metadata = verifyData.data.metadata;
    const churchId = metadata?.church_id;

    // Verify this payment belongs to the user's church
    if (churchId !== profile.church_id) {
      throw new Error("Payment does not belong to this church");
    }

    // Check for idempotency - don't process same reference twice
    const { data: existingEvent } = await supabase
      .from("subscription_events")
      .select("id")
      .eq("event_id", reference)
      .single();

    if (existingEvent) {
      // Already processed, just return success
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified and subscription activated",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Verify error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
