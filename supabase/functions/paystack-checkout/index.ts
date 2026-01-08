import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PricingResult {
  tier_price: number;
  extra_branches: number;
  branch_addon: number;
  total_ghs: number;
}

function computePricing(members: number, branches: number): PricingResult {
  let tier_price: number;
  if (members < 150) {
    tier_price = 99;
  } else if (members <= 5000) {
    tier_price = 299;
  } else {
    tier_price = 599;
  }

  const extra_branches = Math.max(0, branches - 1);
  const branch_addon = extra_branches * 100;
  const total_ghs = tier_price + branch_addon;

  return { tier_price, extra_branches, branch_addon, total_ghs };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
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

    // Get user's profile to find church_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("church_id, email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.church_id) {
      throw new Error("User profile not found");
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("church_id", profile.church_id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    // Calculate pricing based on trial peaks or current usage
    const isTrialing = subscription.status === "trialing";
    const trialNotExpired = new Date(subscription.trial_end_at) > new Date();

    let membersForPricing: number;
    let branchesForPricing: number;

    if (isTrialing) {
      // Get current totals
      const { count: memberCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      const { count: branchCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      membersForPricing = Math.max(
        subscription.trial_peak_total_members,
        memberCount || 0
      );
      branchesForPricing = Math.max(
        subscription.trial_peak_total_branches,
        branchCount || 1
      );
    } else {
      const { count: memberCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      const { count: branchCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      membersForPricing = memberCount || 0;
      branchesForPricing = branchCount || 1;
    }

    const pricing = computePricing(membersForPricing, branchesForPricing);
    const eligibleForDiscount = isTrialing && trialNotExpired;

    // Calculate amounts in pesewas (Paystack uses smallest currency unit)
    const normalAmountPesewas = pricing.total_ghs * 100;
    const discountedAmountPesewas = eligibleForDiscount
      ? Math.round(pricing.total_ghs * 0.9 * 100)
      : normalAmountPesewas;

    const email = profile.email || user.email;
    if (!email) {
      throw new Error("User email not found");
    }

    // Get or create Paystack customer
    let customerCode = subscription.paystack_customer_code;

    if (!customerCode) {
      const customerRes = await fetch("https://api.paystack.co/customer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          first_name: profile.full_name?.split(" ")[0] || "",
          last_name: profile.full_name?.split(" ").slice(1).join(" ") || "",
          metadata: {
            church_id: profile.church_id,
          },
        }),
      });

      const customerData = await customerRes.json();
      if (!customerData.status) {
        throw new Error(customerData.message || "Failed to create customer");
      }

      customerCode = customerData.data.customer_code;

      // Save customer code
      await supabase
        .from("subscriptions")
        .update({
          paystack_customer_code: customerCode,
          paystack_email: email,
          updated_at: new Date().toISOString(),
        })
        .eq("church_id", profile.church_id);
    }

    // Generate unique reference
    const reference = `churchflow_${profile.church_id}_${Date.now()}`;

    // Initialize transaction
    const callbackUrl = `${req.headers.get("origin")}/app/billing/callback`;

    const transactionRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: discountedAmountPesewas,
          reference,
          callback_url: callbackUrl,
          metadata: {
            church_id: profile.church_id,
            normal_amount_ghs: pricing.total_ghs,
            discounted: eligibleForDiscount,
            members_for_pricing: membersForPricing,
            branches_for_pricing: branchesForPricing,
          },
          channels: ["card", "mobile_money"],
        }),
      }
    );

    const transactionData = await transactionRes.json();
    if (!transactionData.status) {
      throw new Error(
        transactionData.message || "Failed to initialize transaction"
      );
    }

    // Update subscription with expected amount
    await supabase
      .from("subscriptions")
      .update({
        current_amount_ghs: pricing.total_ghs,
        early_discount_applied: eligibleForDiscount,
        updated_at: new Date().toISOString(),
      })
      .eq("church_id", profile.church_id);

    return new Response(
      JSON.stringify({
        authorization_url: transactionData.data.authorization_url,
        access_code: transactionData.data.access_code,
        reference: transactionData.data.reference,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Checkout failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
