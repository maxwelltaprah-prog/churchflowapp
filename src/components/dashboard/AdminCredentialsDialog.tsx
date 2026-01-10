import { useState } from "react";
import { Copy, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName: string;
  email: string;
  password: string;
}

export function AdminCredentialsDialog({
  open,
  onOpenChange,
  adminName,
  email,
  password,
}: AdminCredentialsDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopy = async (text: string, type: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "email") {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
      toast.success(`${type === "email" ? "Email" : "Password"} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    setCopiedEmail(false);
    setCopiedPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle>Administrator Created</DialogTitle>
              <DialogDescription>
                {adminName} can now log in using these credentials
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              ⚠️ Save these credentials now!
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              The password cannot be retrieved after closing this dialog.
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                {email}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(email, "email")}
              >
                {copiedEmail ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                {showPassword ? password : "••••••••••"}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(password, "password")}
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
