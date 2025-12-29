import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, ArrowLeft, Eye, EyeOff, Hash, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MemberLogin() {
  const [memberCode, setMemberCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleMemberCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setMemberCode(value);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 6
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (memberCode.length !== 4) {
      toast({
        title: "Invalid Member Code",
        description: "Please enter exactly 4 digits (the last 4 digits of your phone number).",
        variant: "destructive",
      });
      return;
    }

    if (pin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter at least 4 digits for your PIN.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Find members whose phone ends with these 4 digits and have auth accounts
      const { data: members, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, phone, approval_status, user_id")
        .like("phone", `%${memberCode}`)
        .eq("is_active", true)
        .not("user_id", "is", null);

      if (memberError) throw memberError;

      if (!members || members.length === 0) {
        toast({
          title: "Member not found",
          description: "No account found with this member code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Try to authenticate with each matching member until one succeeds
      let authenticatedMember = null;
      let lastError = null;

      for (const member of members) {
        if (!member.user_id || !member.phone) continue;

        if (member.approval_status === "pending") continue;
        if (member.approval_status === "rejected") continue;

        // Convert phone to the email format used during registration
        const authEmail = `${member.phone.replace(/[^0-9]/g, "")}@churchflow.member`;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: pin,
        });

        if (!signInError) {
          authenticatedMember = member;
          break;
        }
        
        lastError = signInError;
      }

      if (!authenticatedMember) {
        // Check if all matching members are pending/rejected
        const pendingMember = members.find(m => m.approval_status === "pending");
        const rejectedMember = members.find(m => m.approval_status === "rejected");

        if (pendingMember && members.length === 1) {
          toast({
            title: "Pending approval",
            description: "Your membership is still pending approval. Please wait for an administrator to approve your registration.",
            variant: "destructive",
          });
          return;
        }

        if (rejectedMember && members.length === 1) {
          toast({
            title: "Membership rejected",
            description: "Your membership application was not approved. Please contact your church administrator.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Invalid credentials",
          description: "The member code or PIN is incorrect. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: `Logged in as ${authenticatedMember.full_name}`,
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
              Sign in with your member code and PIN
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="memberCode">Member Code</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="memberCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Last 4 digits of your phone number"
                    value={memberCode}
                    onChange={handleMemberCodeChange}
                    className="pl-10 h-12 text-center text-lg font-mono tracking-widest"
                    maxLength={4}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the last 4 digits of your registered phone number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Member PIN</Label>
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
                    maxLength={6}
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
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading || memberCode.length !== 4}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Forgot your PIN?{" "}
                <span className="text-foreground">Contact your church administrator to reset it.</span>
              </p>
              <p className="text-muted-foreground text-center">
                Don't have an account?{" "}
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
