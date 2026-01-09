import { Gift, AlertCircle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useComplementarySMSStatus } from "@/hooks/useSMSData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ComplementarySMSCard() {
  const { data: smsStatus, isLoading } = useComplementarySMSStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  // Not eligible (Starter tier)
  if (!smsStatus?.eligible) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Gift className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-muted-foreground">Complementary SMS</p>
                <Badge variant="outline" className="text-xs">Starter</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade to Growth or Enterprise for 900 free SMS/month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { remaining, quota, used, days_until_reset, tier } = smsStatus;
  const usagePercentage = quota > 0 ? ((quota - remaining) / quota) * 100 : 0;
  const isLow = remaining <= 100 && remaining > 0;
  const isExhausted = remaining === 0;

  return (
    <div className="space-y-4">
      <Card className={`border-2 ${isExhausted ? 'border-destructive/50 bg-destructive/5' : isLow ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : 'border-kpi-green/30 bg-kpi-green/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isExhausted ? 'bg-destructive/20' : isLow ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-kpi-green/20'}`}>
              <Gift className={`h-5 w-5 ${isExhausted ? 'text-destructive' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-kpi-green'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Complementary SMS</p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {tier}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${isExhausted ? 'text-destructive' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-kpi-green'}`}>
                    {remaining}
                  </span>
                  <span className="text-sm text-muted-foreground">/{quota}</span>
                </div>
              </div>
              
              <Progress 
                value={usagePercentage} 
                className={`mt-2 h-2 ${isExhausted ? '[&>div]:bg-destructive' : isLow ? '[&>div]:bg-amber-500' : '[&>div]:bg-kpi-green'}`}
              />
              
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{used} used this cycle</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Resets in {days_until_reset} days</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isExhausted && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SMS Credits Exhausted</AlertTitle>
          <AlertDescription>
            You've used all 900 complementary SMS credits for this billing cycle. 
            Your credits will automatically reset in {days_until_reset} days at the start of your next cycle.
          </AlertDescription>
        </Alert>
      )}

      {isLow && !isExhausted && (
        <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Low SMS Credits</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            You have only {remaining} complementary SMS credits remaining. 
            Plan your messages carefully until your credits reset in {days_until_reset} days.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
