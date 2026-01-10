import { useState } from "react";
import { Loader2, Eye, EyeOff, Copy, Check, KeyRound, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetAdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName: string;
  adminEmail: string;
  adminUserId: string;
}

export function ResetAdminPasswordDialog({
  open,
  onOpenChange,
  adminName,
  adminEmail,
  adminUserId,
}: ResetAdminPasswordDialogProps) {
  const [step, setStep] = useState<"verify" | "reset" | "success">("verify");
  const [superadminPassword, setSuperadminPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showSuperadminPassword, setShowSuperadminPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [error, setError] = useState("");

  const handleVerifySuperadmin = async () => {
    if (!superadminPassword) {
      setError("Please enter your password");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // Verify superadmin's password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: superadminPassword,
      });

      if (signInError) {
        setError("Incorrect password. Please try again.");
        return;
      }

      setStep("reset");
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsResetting(true);
    setError("");

    try {
      // Call edge function to reset the admin's password
      const { data, error } = await supabase.functions.invoke("reset-admin-password", {
        body: {
          targetUserId: adminUserId,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to reset password");

      setStep("success");
      toast.success("Password reset successfully");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success("Password copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleClose = () => {
    setStep("verify");
    setSuperadminPassword("");
    setNewPassword("");
    setShowSuperadminPassword(false);
    setShowNewPassword(false);
    setError("");
    setCopiedPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {step === "success" ? "Password Reset Complete" : "Reset Admin Password"}
              </DialogTitle>
              <DialogDescription>
                {step === "verify" && "Verify your identity to continue"}
                {step === "reset" && `Set a new password for ${adminName}`}
                {step === "success" && `${adminName} can now log in with the new password`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Verify Superadmin */}
          {step === "verify" && (
            <>
              <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                <p className="font-medium">Resetting password for:</p>
                <p className="text-muted-foreground">{adminName}</p>
                <p className="text-xs text-muted-foreground">{adminEmail}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="superadmin-password">Enter your password to continue</Label>
                <div className="relative">
                  <Input
                    id="superadmin-password"
                    type={showSuperadminPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={superadminPassword}
                    onChange={(e) => setSuperadminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifySuperadmin()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSuperadminPassword(!showSuperadminPassword)}
                  >
                    {showSuperadminPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </>
          )}

          {/* Step 2: Set New Password */}
          {step === "reset" && (
            <>
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Identity verified
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password for {adminName}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ Save the new password now!
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  The password cannot be retrieved after closing this dialog.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">New Password</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                    {showNewPassword ? newPassword : "••••••••••"}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "verify" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleVerifySuperadmin} disabled={isVerifying}>
                {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify & Continue
              </Button>
            </>
          )}
          {step === "reset" && (
            <>
              <Button variant="outline" onClick={() => setStep("verify")}>
                Back
              </Button>
              <Button onClick={handleResetPassword} disabled={isResetting}>
                {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </>
          )}
          {step === "success" && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
