import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVerifyPayment } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function BillingCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate: verifyPayment, isPending, isSuccess, isError, error } =
    useVerifyPayment();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");

    const ref = reference || trxref;

    if (ref && !verified) {
      setVerified(true);
      verifyPayment(ref);
    }
  }, [searchParams, verifyPayment, verified]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {isPending && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
              <h2 className="text-xl font-semibold">Verifying Payment...</h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment.
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-xl font-semibold text-green-600">
                Payment Successful!
              </h2>
              <p className="text-muted-foreground">
                Your subscription is now active. You have full access to
                ChurchFlow.
              </p>
              <Button onClick={() => navigate("/app")} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {isError && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">
                Verification Failed
              </h2>
              <p className="text-muted-foreground">
                {(error as Error)?.message ||
                  "We couldn't verify your payment. Please try again or contact support."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/app/billing")}
                  className="flex-1"
                >
                  Back to Billing
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!isPending && !isSuccess && !isError && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 mx-auto text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Processing...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
