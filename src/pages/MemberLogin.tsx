import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, ArrowLeft, Eye, EyeOff, Phone, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MemberLogin() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First check if member exists and is approved (only members with auth accounts)
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, approval_status, user_id")
        .eq("phone", phone.trim())
        .eq("is_active", true)
        .not("user_id", "is", null)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!member) {
        toast({
          title: "Member not found",
          description: "No account found with this phone number. Please register first.",
          variant: "destructive",
        });
        return;
      }

      if (!member.user_id) {
        toast({
          title: "Account not set up",
          description: "Please complete your registration first.",
          variant: "destructive",
        });
        return;
      }

      if (member.approval_status === "pending") {
        toast({
          title: "Pending approval",
          description: "Your membership is still pending approval. Please wait for an administrator to approve your registration.",
          variant: "destructive",
        });
        return;
      }

      if (member.approval_status === "rejected") {
        toast({
          title: "Membership rejected",
          description: "Your membership application was not approved. Please contact your church administrator.",
          variant: "destructive",
        });
        return;
      }

      // Convert phone to the email format used during registration
      const authEmail = `${phone.replace(/[^0-9]/g, "")}@churchflow.member`;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: pin,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          toast({
            title: "Invalid PIN",
            description: "The PIN you entered is incorrect. Please try again.",
            variant: "destructive",
          });
        } else {
          throw signInError;
        }
        return;
      }

      toast({
        title: "Welcome back!",
        description: `Logged in as ${member.full_name}`,
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
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+233 XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pl-10 pr-10 h-12"
                    minLength={4}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
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
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-muted-foreground">
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
