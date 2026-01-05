import { useState } from "react";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BuyCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREDIT_PACKAGES = [
  { credits: 100, price: 10, label: "100 SMS" },
  { credits: 500, price: 45, label: "500 SMS" },
  { credits: 1000, price: 80, label: "1,000 SMS" },
  { credits: 5000, price: 350, label: "5,000 SMS" },
];

export function BuyCreditDialog({ open, onOpenChange }: BuyCreditDialogProps) {
  const { profile, user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0] | null>(null);
  const [customCredits, setCustomCredits] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!profile?.church_id || !user?.id) {
      toast.error("You must be logged in");
      return;
    }

    const credits = selectedPackage?.credits || parseInt(customCredits);
    if (!credits || credits < 10) {
      toast.error("Minimum purchase is 10 credits");
      return;
    }

    // Price calculation: 0.10 GHS per credit
    const price = selectedPackage?.price || Math.ceil(credits * 0.10);

    setIsProcessing(true);

    try {
      // Get the current page URL for return
      const returnUrl = window.location.origin + "/app/sms";

      // Initiate payment via Hubtel
      const { data, error } = await supabase.functions.invoke("initiate-sms-payment", {
        body: {
          churchId: profile.church_id,
          userId: user.id,
          credits: credits,
          amount: price,
          returnUrl: returnUrl,
          customerPhone: user.phone || "",
          customerName: profile.full_name || user.email,
        },
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        toast.success("Redirecting to payment...");
        // Open Hubtel checkout in same window
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "Failed to initiate payment");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy SMS Credits
          </DialogTitle>
          <DialogDescription>
            Choose a package or enter a custom amount. Payment via Hubtel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Credit Packages */}
          <div className="grid grid-cols-2 gap-3">
            {CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.credits}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setCustomCredits("");
                }}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedPackage?.credits === pkg.credits
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="font-semibold">{pkg.label}</div>
                <div className="text-lg font-bold text-primary">GHS {pkg.price}</div>
                <div className="text-xs text-muted-foreground">
                  GHS {(pkg.price / pkg.credits).toFixed(3)}/SMS
                </div>
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label>Or enter custom amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Number of credits"
                value={customCredits}
                onChange={(e) => {
                  setCustomCredits(e.target.value);
                  setSelectedPackage(null);
                }}
                min={10}
              />
              {customCredits && (
                <div className="flex items-center px-3 bg-muted rounded-md text-sm whitespace-nowrap">
                  GHS {Math.ceil(parseInt(customCredits) * 0.10)}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Minimum 10 credits</p>
          </div>

          {/* Summary */}
          {(selectedPackage || customCredits) && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between">
                <span>Credits:</span>
                <span className="font-medium">
                  {selectedPackage?.credits || customCredits}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Total:</span>
                <span className="font-bold text-primary">
                  GHS {selectedPackage?.price || Math.ceil(parseInt(customCredits || "0") * 0.10)}
                </span>
              </div>
            </div>
          )}

          {/* Payment notice */}
          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to Hubtel to complete payment via Mobile Money or Card
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={isProcessing || (!selectedPackage && !customCredits)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Pay with Hubtel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
