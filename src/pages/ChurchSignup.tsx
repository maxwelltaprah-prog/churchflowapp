import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, Mail, Lock, User, Building2, ArrowLeft, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createChurchWithAdmin } from "@/lib/church-service";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type SignupStep = "form" | "otp";

export default function ChurchSignup() {
  const [step, setStep] = useState<SignupStep>("form");
  const [formData, setFormData] = useState({
    churchName: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-signup-otp", {
        body: {
          email: formData.email,
          churchName: formData.churchName,
        },
      });

      if (error) throw error;

      toast({
        title: "Verification code sent",
        description: "Please check your email for the 6-digit code.",
      });

      setStep("otp");
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Failed to send verification code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingOtp(true);
    
    try {
      // Verify OTP
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-signup-otp", {
        body: {
          email: formData.email,
          otp: otp,
        },
      });

      if (verifyError) throw verifyError;
      if (!verifyData.valid) {
        throw new Error(verifyData.error || "Invalid verification code");
      }

      setIsLoading(true);

      // Create church account - this also signs up and signs in the user
      await createChurchWithAdmin({
        churchName: formData.churchName,
        adminName: formData.adminName,
        email: formData.email,
        password: formData.password
      });

      toast({
        title: "Church created successfully!",
        description: "Welcome to ChurchFlow. Redirecting to your dashboard...",
      });

      // Force full reload to refresh auth context with new profile data
      window.location.href = "/app";
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingOtp(false);
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const { error } = await supabase.functions.invoke("send-signup-otp", {
        body: {
          email: formData.email,
          churchName: formData.churchName,
        },
      });

      if (error) throw error;

      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email.",
      });
      setOtp("");
    } catch (error: any) {
      toast({
        title: "Failed to resend code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
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
              {step === "form" ? (
                <>
                  <div className="lg:block hidden mb-6">
                    <h2 className="text-xl font-bold text-foreground mb-1">Create Your Account</h2>
                    <p className="text-muted-foreground text-sm">Fill in the details below</p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-5">
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
                          minLength={6}
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
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full"
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending Code...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Verify Your Email</h2>
                    <p className="text-muted-foreground text-sm">
                      We sent a 6-digit code to<br />
                      <span className="font-medium text-foreground">{formData.email}</span>
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      onClick={handleVerifyAndCreate}
                      disabled={otp.length !== 6 || isVerifyingOtp || isLoading}
                    >
                      {isVerifyingOtp || isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isVerifyingOtp ? "Verifying..." : "Creating Account..."}
                        </>
                      ) : (
                        "Verify & Create Account"
                      )}
                    </Button>

                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Didn't receive the code?{" "}
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSendingOtp}
                          className="text-primary font-medium hover:underline disabled:opacity-50"
                        >
                          {isSendingOtp ? "Sending..." : "Resend"}
                        </button>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("form");
                          setOtp("");
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        ← Back to form
                      </button>
                    </div>
                  </div>
                </>
              )}

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
