import { useNavigate } from "react-router-dom";
import { useIsAppLocked, useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export function PaywallLock() {
  const navigate = useNavigate();
  const { isLocked, status } = useIsAppLocked();
  const { data: subscription } = useSubscription();

  if (!isLocked) {
    return null;
  }

  const lockedDate = subscription?.locked_at
    ? format(new Date(subscription.locked_at), "MMM d, yyyy")
    : "";

  const getMessage = () => {
    switch (status) {
      case "expired_locked":
        return {
          title: "Testing Phase Ended",
          description: `The testing phase has ended${
            lockedDate ? ` on ${lockedDate}` : ""
          }. Subscribe now to continue with full access to your church data.`,
          icon: Lock,
        };
      case "past_due":
        return {
          title: "Payment Past Due",
          description:
            "Your subscription payment failed. Please update your payment method to restore access.",
          icon: AlertTriangle,
        };
      case "canceled":
        return {
          title: "Subscription Canceled",
          description:
            "Your subscription has been canceled. Subscribe again to restore access to your church data.",
          icon: Lock,
        };
      default:
        return {
          title: "Access Restricted",
          description:
            "Subscribe to continue using ChurchFlow with all your existing data.",
          icon: Lock,
        };
    }
  };

  const { title, description, icon: Icon } = getMessage();

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-elevated p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6">{description}</p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Your data is safe!
            </span>{" "}
            All your church members, attendance records, and settings are
            preserved. Subscribe to restore full access.
          </p>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate("/app/billing")}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Subscribe to Restore Access
        </Button>
      </div>
    </div>
  );
}
