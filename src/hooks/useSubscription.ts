import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SubscriptionStatus = 
  | "trialing" 
  | "active" 
  | "past_due" 
  | "canceled" 
  | "expired_locked";

export interface Subscription {
  id: string;
  church_id: string;
  status: SubscriptionStatus;
  trial_start_at: string;
  trial_end_at: string;
  trial_peak_total_members: number;
  trial_peak_total_branches: number;
  locked_at: string | null;
  paystack_customer_code: string | null;
  paystack_plan_code: string | null;
  paystack_subscription_code: string | null;
  paystack_email: string | null;
  current_amount_ghs: number;
  currency: string;
  early_discount_applied: boolean;
  first_payment_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingBreakdown {
  tier_price: number;
  extra_branches: number;
  branch_addon: number;
  total_ghs: number;
  discounted_first_month: number | null;
  eligible_for_discount: boolean;
}

export interface ChurchTotals {
  total_members: number;
  total_branches: number;
}

// Fetch subscription for current church
export function useSubscription() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["subscription", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("church_id", profile.church_id)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!profile?.church_id,
    refetchInterval: 60000, // Refetch every minute to check trial status
  });
}

// Fetch current church totals
export function useChurchTotals() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["church-totals", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Get total members count
      const { count: memberCount, error: memberError } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      if (memberError) throw memberError;

      // Get total active branches count
      const { count: branchCount, error: branchError } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (branchError) throw branchError;

      return {
        total_members: memberCount || 0,
        total_branches: branchCount || 1,
      } as ChurchTotals;
    },
    enabled: !!profile?.church_id,
  });
}

// Calculate pricing based on members and branches
export function computePricing(
  members: number,
  branches: number,
  eligibleForDiscount: boolean
): PricingBreakdown {
  // Calculate tier based on total members
  let tier_price: number;
  if (members < 150) {
    tier_price = 99;
  } else if (members <= 5000) {
    tier_price = 299;
  } else {
    tier_price = 599;
  }

  // Calculate branch addon (first branch included)
  const extra_branches = Math.max(0, branches - 1);
  const branch_addon = extra_branches * 100;

  // Calculate total
  const total_ghs = tier_price + branch_addon;

  // Calculate discounted first month if eligible
  const discounted_first_month = eligibleForDiscount
    ? Math.round(total_ghs * 0.9 * 100) / 100
    : null;

  return {
    tier_price,
    extra_branches,
    branch_addon,
    total_ghs,
    discounted_first_month,
    eligible_for_discount: eligibleForDiscount,
  };
}

// Hook to get full pricing breakdown
export function usePricingBreakdown() {
  const { data: subscription } = useSubscription();
  const { data: totals } = useChurchTotals();

  if (!subscription || !totals) {
    return null;
  }

  const isTrialing = subscription.status === "trialing";
  const trialNotExpired = new Date(subscription.trial_end_at) > new Date();
  const eligibleForDiscount = isTrialing && trialNotExpired;

  // Use peak totals during trial, otherwise use current totals
  const membersForPricing = isTrialing
    ? Math.max(subscription.trial_peak_total_members, totals.total_members)
    : totals.total_members;
  const branchesForPricing = isTrialing
    ? Math.max(subscription.trial_peak_total_branches, totals.total_branches)
    : totals.total_branches;

  return {
    ...computePricing(membersForPricing, branchesForPricing, eligibleForDiscount),
    current_members: totals.total_members,
    current_branches: totals.total_branches,
    peak_members: subscription.trial_peak_total_members,
    peak_branches: subscription.trial_peak_total_branches,
    members_for_pricing: membersForPricing,
    branches_for_pricing: branchesForPricing,
  };
}

// Get trial days remaining
export function useTrialDaysRemaining() {
  const { data: subscription } = useSubscription();

  if (!subscription || subscription.status !== "trialing") {
    return null;
  }

  const trialEnd = new Date(subscription.trial_end_at);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// Check if app should be locked
export function useIsAppLocked() {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading) return { isLocked: false, isLoading: true };

  const lockedStatuses: SubscriptionStatus[] = [
    "expired_locked",
    "past_due",
    "canceled",
  ];

  const isLocked = subscription
    ? lockedStatuses.includes(subscription.status)
    : false;

  return { isLocked, isLoading: false, status: subscription?.status };
}

// Initiate Paystack checkout
export function useInitiateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "paystack-checkout",
        {
          method: "POST",
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      if (data?.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate checkout");
    },
  });
}

// Verify payment after callback
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reference: string) => {
      const { data, error } = await supabase.functions.invoke(
        "paystack-verify",
        {
          method: "POST",
          body: { reference },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Payment verified successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify payment");
    },
  });
}
