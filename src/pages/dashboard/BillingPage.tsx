import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  useSubscription,
  useChurchTotals,
  usePricingBreakdown,
  useTrialDaysRemaining,
  useInitiateCheckout,
} from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PricingTable } from "@/components/billing/PricingTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Users,
  Building2,
  Beaker,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  MessageSquare,
  Gift,
  ArrowRight,
} from "lucide-react";

export default function BillingPage() {
  const navigate = useNavigate();
  const { isChurchAdmin } = useAuth();
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: totals, isLoading: totalsLoading } = useChurchTotals();
  const pricing = usePricingBreakdown();
  const daysRemaining = useTrialDaysRemaining();
  const { mutate: initiateCheckout, isPending: checkoutLoading } =
    useInitiateCheckout();

  const isLoading = subLoading || totalsLoading;

  if (!isChurchAdmin()) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          Only church administrators can access billing settings.
        </p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!subscription) return null;

    const statusConfig: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      trialing: { label: "Testing Phase", variant: "secondary" },
      active: { label: "Active", variant: "default" },
      past_due: { label: "Past Due", variant: "destructive" },
      canceled: { label: "Canceled", variant: "destructive" },
      expired_locked: { label: "Expired", variant: "destructive" },
    };

    const config = statusConfig[subscription.status] || {
      label: subscription.status,
      variant: "outline" as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTierName = (price: number) => {
    if (price === 99) return "Starter";
    if (price === 299) return "Growth";
    return "Enterprise";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription"
        description="Manage your church subscription and billing"
      />

      {/* Testing Phase Status Card */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            Subscription Status
          </CardTitle>
          {getStatusBadge()}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : subscription?.status === "trialing" ? (
            <div className="space-y-4">
              {/* Testing Phase Banner */}
              <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-indigo-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Beaker className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">
                      You're in the Testing Phase
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      All Features Free
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Enjoy full access to all ChurchFlow features. No billing during this period.
                  </p>
                  
                  {/* Feedback CTA */}
                  <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <Gift className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Share your feedback</span> and receive a{" "}
                        <span className="font-semibold text-purple-600">special discount</span>{" "}
                        when production begins!
                      </p>
                    </div>
                    <a href="mailto:info@easychurchflow.com?subject=ChurchFlow Feedback">
                      <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Send Feedback
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-indigo-600" />
                  What happens after the testing phase?
                </h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                    <p>Production begins with a <strong>14-day free trial</strong> to continue exploring</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                    <p>After the trial, subscription billing starts based on your usage</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">★</div>
                    <p><strong className="text-purple-700">Feedback providers</strong> get a special discount on their first months!</p>
                  </div>
                </div>
              </div>
            </div>
          ) : subscription?.status === "active" ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Subscription Active</p>
                <p className="text-sm text-muted-foreground">
                  {getTierName(subscription.current_amount_ghs)} Plan - GHS{" "}
                  {subscription.current_amount_ghs}/month
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-medium">Subscription Inactive</p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to restore full access to your church data
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>Total Members</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {totals?.total_members || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span>Active Branches</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {totals?.total_branches || 1}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {subscription?.status === "trialing" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peak Usage (for future pricing)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span>Peak Members</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {subscription?.trial_peak_total_members || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span>Peak Branches</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {subscription?.trial_peak_total_branches || 1}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After testing, subscription pricing will be based on your peak usage
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pricing Preview (for testing phase) */}
      {pricing && subscription?.status === "trialing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Future Pricing Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is what your pricing would be after the testing phase, based on your current peak usage.
              No payment is required during the testing phase.
            </p>
            <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {getTierName(pricing.tier_price)} Plan (
                  {pricing.members_for_pricing < 150
                    ? "<150"
                    : pricing.members_for_pricing <= 5000
                    ? "150-5000"
                    : "5000+"}{" "}
                  members)
                </span>
                <span>GHS {pricing.tier_price}</span>
              </div>

              {pricing.extra_branches > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Additional Branches ({pricing.extra_branches} × GHS 100)
                  </span>
                  <span>GHS {pricing.branch_addon}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Estimated Monthly Total</span>
                <span>GHS {pricing.total_ghs}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <Gift className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-purple-700">
                <strong>Provide feedback</strong> and get a special discount when production begins!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Pricing Breakdown */}
      {pricing && subscription?.status !== "trialing" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {getTierName(pricing.tier_price)} Plan (
                  {pricing.members_for_pricing < 150
                    ? "<150"
                    : pricing.members_for_pricing <= 5000
                    ? "150-5000"
                    : "5000+"}{" "}
                  members)
                </span>
                <span>GHS {pricing.tier_price}</span>
              </div>

              {pricing.extra_branches > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Additional Branches ({pricing.extra_branches} × GHS 100)
                  </span>
                  <span>GHS {pricing.branch_addon}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Monthly Total</span>
                <span>GHS {pricing.total_ghs}</span>
              </div>

              {pricing.eligible_for_discount && pricing.discounted_first_month && (
                <>
                  <Separator />
                  <div className="flex justify-between text-primary">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      First Month (10% discount)
                    </span>
                    <span className="font-semibold">
                      GHS {pricing.discounted_first_month}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After the first month, you'll be charged GHS {pricing.total_ghs}
                    /month
                  </p>
                </>
              )}
            </div>

            {(subscription?.status === "expired_locked" ||
              subscription?.status === "canceled") && (
              <Button
                size="lg"
                className="w-full"
                onClick={() => initiateCheckout()}
                disabled={checkoutLoading}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {checkoutLoading
                  ? "Redirecting to payment..."
                  : pricing.eligible_for_discount
                  ? `Subscribe Now - Pay GHS ${pricing.discounted_first_month}`
                  : `Subscribe Now - GHS ${pricing.total_ghs}/month`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Plans</h2>
        <PricingTable highlightTier={pricing?.tier_price} />
      </div>
    </div>
  );
}
