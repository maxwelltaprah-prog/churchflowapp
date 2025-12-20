import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, Mail, Lock, User, Building2, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChurchSignup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    churchName: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      toast({
        title: "Coming Soon",
        description: "Church registration will be available once the backend is connected.",
      });
      setIsLoading(false);
    }, 1000);
  };

  const features = [
    "Unlimited branches",
    "Real-time attendance tracking",
    "Member QR codes",
    "Analytics dashboard",
    "Broadcast messaging",
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      <div className="container pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Info */}
          <div className="hidden lg:block">
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
                  <Church className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">ChurchFlow</span>
              </Link>
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-4">
              Start Managing Your Church <span className="text-gradient">Attendance Today</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Create your church account and get started in minutes. Your main branch will be created automatically.
            </p>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-card rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold">
                  PB
                </div>
                <div>
                  <div className="font-semibold text-foreground">Pastor Benjamin</div>
                  <div className="text-sm text-muted-foreground">Grace Community Church</div>
                </div>
              </div>
              <p className="text-muted-foreground italic">
                "ChurchFlow transformed how we track attendance across our 5 branches. 
                The QR system is so fast, our ushers love it!"
              </p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
                  <Church className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">ChurchFlow</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground mb-2">Create Church Account</h1>
              <p className="text-muted-foreground">Get started in minutes</p>
            </div>

            <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
              <div className="lg:block hidden mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">Create Your Account</h2>
                <p className="text-muted-foreground text-sm">Fill in the details below</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="churchName">Church Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="churchName"
                      name="churchName"
                      type="text"
                      placeholder="Grace Community Church"
                      value={formData.churchName}
                      onChange={handleChange}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName">Your Name (Admin)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="adminName"
                      name="adminName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.adminName}
                      onChange={handleChange}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="admin@church.com"
                      value={formData.email}
                      onChange={handleChange}
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
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 pr-10 h-12"
                      required
                      minLength={8}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 h-12"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Church Account"}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
