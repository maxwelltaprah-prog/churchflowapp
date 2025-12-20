import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, Mail, Lock, ArrowLeft, Eye, EyeOff, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
        return;
      }

      // Check if this user is linked to a member record
      const { data: member } = await supabase
        .from("members")
        .select("id, approval_status")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!member) {
        await supabase.auth.signOut();
        toast({
          title: "No member account",
          description: "This account is not linked to a member profile. Please sign up first.",
          variant: "destructive",
        });
        return;
      }

      if (member.approval_status !== "approved") {
        await supabase.auth.signOut();
        toast({
          title: "Account pending approval",
          description: "Your membership is still pending approval. Please wait for an administrator to approve your registration.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Redirecting to your portal...",
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Member Login</h1>
            <p className="text-muted-foreground">Sign in to view your attendance and QR code</p>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="mt-6 pt-6 border-t border-border text-center space-y-3">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/member/signup" className="text-primary font-medium hover:underline">
                  Create account
                </Link>
              </p>
              <p className="text-muted-foreground">
                Not registered yet?{" "}
                <Link to="/join" className="text-accent font-medium hover:underline">
                  Join your branch first
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Are you an admin?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Admin login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}