import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getClientIdentifier, checkServerRateLimit, recordAttempt, rateLimitResponse } from "../_shared/rate-limiting.ts";
import { secureJsonResponse, secureErrorResponse } from "../_shared/security-headers.ts";
import { validateDeploymentSecurity } from "../_shared/deployment-check.ts";

// Validate deployment security on cold start
validateDeploymentSecurity("paystack-checkout", ["payments"]);

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureErrorResponse("No authorization header", corsHeaders, 401);
    }

    // Rate limiting for payment endpoints
    const ipIdentifier = getClientIdentifier(req);
    const rateLimit = checkServerRateLimit(ipIdentifier, "payment");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    recordAttempt(ipIdentifier, "payment");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      return secureErrorResponse("Paystack not configured", corsHeaders, 500);
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

    // Get user's profile to find church_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("church_id, email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.church_id) {
      return secureErrorResponse("User profile not found", corsHeaders, 404);
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("church_id", profile.church_id)
      .single();

    if (subError || !subscription) {
      return secureErrorResponse("Subscription not found", corsHeaders, 404);
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
      return secureErrorResponse("User email not found", corsHeaders, 400);
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
        return secureErrorResponse("Failed to create customer", corsHeaders, 500);
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
      return secureErrorResponse("Failed to initialize transaction", corsHeaders, 500);
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

    return secureJsonResponse({
      authorization_url: transactionData.data.authorization_url,
      access_code: transactionData.data.access_code,
      reference: transactionData.data.reference,
    }, corsHeaders);
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    return secureErrorResponse("Checkout failed", corsHeaders, 400);
  }
});
