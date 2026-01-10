import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, ArrowLeft, Eye, EyeOff, Phone, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { padPin } from "@/lib/pin-utils";
import { checkRateLimit, recordFailedAttempt, clearRateLimit, formatLockoutTime } from "@/lib/security-utils";

export default function MemberLogin() {
  const [memberCode, setMemberCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleMemberCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 15 (for full phone numbers)
    const value = e.target.value.replace(/\D/g, "").slice(0, 15);
    setMemberCode(value);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (memberCode.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter your full phone number (at least 9 digits).",
        variant: "destructive",
      });
      return;
    }

    if (pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter your 4-digit PIN.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    const rateLimitStatus = checkRateLimit(memberCode);
    if (rateLimitStatus.isLocked) {
      toast({
        title: "Too many attempts",
        description: `Account temporarily locked. Try again in ${formatLockoutTime(rateLimitStatus.remainingTime)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use secure edge function to verify phone without exposing member data
      const normalizedPhone = memberCode.replace(/\D/g, "");
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-member-phone`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone: normalizedPhone, action: "login" }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast({
          title: result.approval_status === "pending" ? "Pending approval" : 
                 result.approval_status === "rejected" ? "Membership rejected" :
                 result.has_account === false ? "Account not set up" : "Login failed",
          description: result.error || "The phone number or PIN is incorrect. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Now attempt to sign in with the verified phone
      // IMPORTANT: Use the exact phone format from the database without modification
      // The auth email was created with the exact phone format stored in the DB
      const authPhoneNormalized = result.member_phone.replace(/[^0-9]/g, "");
      const authEmail = `${authPhoneNormalized}@churchflow.member`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: padPin(pin),
      });

      if (signInError) {
        const lockoutStatus = recordFailedAttempt(memberCode);
        toast({
          title: "Invalid credentials",
          description: lockoutStatus.isLocked 
            ? `Too many attempts. Try again in ${formatLockoutTime(lockoutStatus.remainingTime)}.`
            : "The phone number or PIN is incorrect.",
          variant: "destructive",
        });
        return;
      }

      clearRateLimit(memberCode);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${result.member_name}`,
      });
      navigate("/member");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="container pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
                <Church className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">ChurchFlow</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm mb-4">
              <User className="w-4 h-4" />
              Member Portal
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in with your phone number and PIN
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="memberCode">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="memberCode"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter your phone number"
                    value={memberCode}
                    onChange={handleMemberCodeChange}
                    className="pl-10 h-12 text-lg font-mono tracking-wide"
                    maxLength={15}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your registered phone number
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pin">Member PIN</Label>
                  <Link 
                    to="/member-login" 
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      toast({
                        title: "Contact Your Administrator",
                        description: "Please contact your church administrator to reset your PIN.",
                      });
                    }}
                  >
                    Forgot PIN?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      placeholder="Your 4-digit PIN"
                      value={pin}
                      onChange={handlePinChange}
                      className="pl-10 pr-10 h-12 text-center text-lg font-mono tracking-widest"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      required
                    />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">4 digits</p>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading || memberCode.length < 9}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Added by your church but no PIN yet?{" "}
                <Link to="/create-pin" className="text-primary font-medium hover:underline">
                  Create PIN
                </Link>
              </p>
              <p className="text-muted-foreground text-center">
                New to this church?{" "}
                <Link to="/join" className="text-primary font-medium hover:underline">
                  Join a Branch
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Admin Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
