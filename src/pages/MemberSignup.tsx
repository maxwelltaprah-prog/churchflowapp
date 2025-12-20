import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, Mail, Lock, ArrowLeft, Eye, EyeOff, Phone, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MemberSignup() {
  const [step, setStep] = useState<"phone" | "account" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [memberData, setMemberData] = useState<{ id: string; full_name: string; branch_name: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Find member by phone number
      const { data: member, error } = await supabase
        .from("members")
        .select("id, full_name, user_id, approval_status, branches(name)")
        .eq("phone", phone.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!member) {
        toast({
          title: "Member not found",
          description: "No member record found with this phone number. Please register at your branch first.",
          variant: "destructive",
        });
        return;
      }

      if (member.user_id) {
        toast({
          title: "Account already exists",
          description: "An account is already linked to this phone number. Please login instead.",
          variant: "destructive",
        });
        return;
      }

      if (member.approval_status !== "approved") {
        toast({
          title: "Pending approval",
          description: "Your membership is still pending approval. Please wait for an administrator to approve your registration before creating an account.",
          variant: "destructive",
        });
        return;
      }

      setMemberData({
        id: member.id,
        full_name: member.full_name,
        branch_name: (member.branches as any)?.name || "Your Branch"
      });
      setStep("account");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData) return;
    setIsLoading(true);

    try {
      // Create auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/member`,
          data: { full_name: memberData.full_name }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Link member record to user
      const { error: updateError } = await supabase
        .from("members")
        .update({ 
          user_id: authData.user.id,
          email: email 
        })
        .eq("id", memberData.id);

      if (updateError) throw updateError;

      setStep("success");
      toast({
        title: "Account created!",
        description: "You can now login to access your member portal.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success") {
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
          <div className="w-full max-w-md text-center">
            <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">Account Created!</h1>
              <p className="text-muted-foreground mb-6">
                Welcome, {memberData?.full_name}! Your account is now linked to your member profile.
              </p>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => navigate("/member/login")}
              >
                Continue to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">
              {step === "phone" 
                ? "Enter the phone number you used when registering" 
                : `Welcome, ${memberData?.full_name}! Create your login credentials.`}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-3 h-3 rounded-full ${step === "phone" ? "bg-primary" : "bg-primary/30"}`} />
            <div className="w-8 h-0.5 bg-border" />
            <div className={`w-3 h-3 rounded-full ${step === "account" ? "bg-primary" : "bg-primary/30"}`} />
          </div>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            {step === "phone" ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
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
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number you used during branch registration
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAccountSubmit} className="space-y-6">
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Linking to: </span>
                    <span className="font-medium">{memberData?.full_name}</span>
                    <span className="text-muted-foreground"> at </span>
                    <span className="font-medium">{memberData?.branch_name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At least 6 characters
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/member/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}