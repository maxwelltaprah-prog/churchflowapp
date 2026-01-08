import { useNavigate } from "react-router-dom";
import { useTrialDaysRemaining, useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export function TrialBanner() {
  const navigate = useNavigate();
  const { isChurchAdmin } = useAuth();
  const daysRemaining = useTrialDaysRemaining();
  const { data: subscription } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Only show to church admins during trial
  if (!isChurchAdmin() || daysRemaining === null || dismissed) {
    return null;
  }

  const trialEndDate = subscription?.trial_end_at
    ? format(new Date(subscription.trial_end_at), "MMM d, yyyy")
    : "";

  const urgencyClass =
    daysRemaining <= 3
      ? "bg-destructive/10 border-destructive/30 text-destructive"
      : daysRemaining <= 7
      ? "bg-warning/10 border-warning/30 text-warning-foreground"
      : "bg-primary/10 border-primary/30 text-primary";

  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-4 py-3 border rounded-lg mb-4 ${urgencyClass}`}
    >
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="font-medium">
            Trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
            ({trialEndDate})
          </span>
          <span className="text-sm opacity-80 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Subscribe now and get 10% off your first month!
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => navigate("/app/billing")}
          className="whitespace-nowrap"
        >
          Subscribe Now
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
