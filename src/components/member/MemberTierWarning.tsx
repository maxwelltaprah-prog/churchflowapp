import { AlertTriangle, TrendingUp, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MemberTierStatus } from "@/hooks/useMemberTierLimit";

interface MemberTierWarningProps {
  tierStatus: MemberTierStatus;
  className?: string;
}

export function MemberTierWarning({ tierStatus, className }: MemberTierWarningProps) {
  const navigate = useNavigate();
  
  const {
    currentMembers,
    tierLimit,
    tierName,
    nextTierName,
    nextTierPrice,
    isAtLimit,
    isApproachingLimit,
    remainingSlots,
  } = tierStatus;

  if (!isApproachingLimit && !isAtLimit) {
    return null;
  }

  const handleUpgrade = () => {
    navigate("/app/billing");
  };

  if (isAtLimit) {
    return (
      <Alert variant="destructive" className={className}>
        <Lock className="h-4 w-4" />
        <AlertTitle className="font-semibold">Member Limit Reached</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            You've reached the maximum of <strong>{tierLimit} members</strong> on the {tierName} plan. 
            {nextTierName && nextTierPrice && (
              <> Upgrade to the <strong>{nextTierName}</strong> plan (GHS {nextTierPrice}/month) to add more members.</>
            )}
          </p>
          {nextTierName && (
            <Button 
              onClick={handleUpgrade} 
              size="sm"
              className="bg-kpi-amber hover:bg-kpi-amber/90 text-primary-foreground"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade to {nextTierName}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Approaching limit warning
  return (
    <Alert className={`border-kpi-amber/50 bg-kpi-amber/10 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-kpi-amber" />
      <AlertTitle className="text-kpi-amber font-semibold">Approaching Member Limit</AlertTitle>
      <AlertDescription className="mt-2 text-muted-foreground">
        <p className="mb-3">
          You have <strong>{currentMembers}/{tierLimit}</strong> members on the {tierName} plan. 
          Only <strong>{remainingSlots} slots</strong> remaining before you need to upgrade.
          {nextTierName && nextTierPrice && (
            <> The <strong>{nextTierName}</strong> plan starts at GHS {nextTierPrice}/month.</>
          )}
        </p>
        {nextTierName && (
          <Button 
            onClick={handleUpgrade} 
            variant="outline" 
            size="sm"
            className="border-kpi-amber/50 text-kpi-amber hover:bg-kpi-amber/20"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Upgrade Options
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
