import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string;
    phone?: string | null;
    user_id?: string | null;
  } | null;
}

export function ResetPinDialog({ open, onOpenChange, member }: ResetPinDialogProps) {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!member) return;

    if (newPin.length < 6) {
      toast.error("PIN must be at least 6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }

    if (!member.user_id) {
      toast.error("This member doesn't have a login account yet");
      return;
    }

    setIsLoading(true);

    try {
      // Use admin API to update user password
      // Note: This requires the service role key which we don't have on client
      // Instead, we'll create an edge function for this
      const response = await supabase.functions.invoke("reset-member-pin", {
        body: {
          userId: member.user_id,
          newPin: newPin,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to reset PIN");
      }

      toast.success(`PIN reset successfully for ${member.full_name}`);
      onOpenChange(false);
      setNewPin("");
      setConfirmPin("");
    } catch (error: any) {
      console.error("Error resetting PIN:", error);
      toast.error(error.message || "Failed to reset PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPin("");
    setConfirmPin("");
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Reset PIN
          </DialogTitle>
          <DialogDescription>
            Set a new PIN for {member.full_name}
          </DialogDescription>
        </DialogHeader>

        {!member.user_id ? (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">No Account Found</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This member was added by an admin and doesn't have a login account. 
                They need to register through the "Join Branch" flow to create an account.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPin">New PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPin"
                  type={showPin ? "text" : "password"}
                  placeholder="Enter new PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  className="pl-10 pr-10"
                  maxLength={6}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 digits</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPin"
                  type={showPin ? "text" : "password"}
                  placeholder="Confirm new PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="pl-10"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {member.user_id && (
            <Button onClick={handleReset} disabled={isLoading || !newPin || !confirmPin}>
              {isLoading ? "Resetting..." : "Reset PIN"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
