import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Church, 
  ArrowLeft, 
  QrCode, 
  User, 
  Phone, 
  ChevronRight,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { generateMemberCode, generateQRToken } from "@/lib/church-service";

export default function JoinBranch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get("code") || "";
  
  const [step, setStep] = useState<"code" | "form" | "success">(initialCode ? "form" : "code");
  const [branchCode, setBranchCode] = useState(initialCode);
  const [branchInfo, setBranchInfo] = useState<{ id: string; church_id: string; name: string } | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    pin: "",
    confirmPin: "",
    gender: "",
    dateOfBirth: "",
    membershipStatus: "",
    ministryGroup: "",
    areaZone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [memberResult, setMemberResult] = useState<{ memberCode: string; branchName: string } | null>(null);
  const { toast } = useToast();

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (branchCode.length < 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid branch code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verify branch exists
      const normalizedCode = branchCode.trim().toUpperCase();
      const { data: branchData, error } = await supabase
        .from("branches")
        .select("id, church_id, name")
        .eq("join_code", normalizedCode)
        .maybeSingle();

      if (error) throw error;
      if (!branchData) {
        toast({
          title: "Branch not found",
          description: "Please check the code and try again.",
          variant: "destructive",
        });
        return;
      }

      setBranchInfo(branchData);
      setStep("form");
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate PIN
    if (formData.pin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be at least 4 digits.",
        variant: "destructive",
      });
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      toast({
        title: "PINs don't match",
        description: "Please make sure your PINs match.",
        variant: "destructive",
      });
      return;
    }

    if (!branchInfo) {
      toast({
        title: "Error",
        description: "Branch information not found. Please start over.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if phone already exists
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("phone", formData.phone.trim())
        .maybeSingle();

      if (existingMember) {
        toast({
          title: "Phone number already registered",
          description: "This phone number is already registered. Please login instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 1. Create auth account using phone as email (phone@churchflow.local) with PIN as password
      const authEmail = `${formData.phone.replace(/[^0-9]/g, "")}@churchflow.member`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password: formData.pin,
        options: {
          emailRedirectTo: `${window.location.origin}/member`,
          data: { 
            full_name: formData.fullName,
            is_member: true
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // 2. Generate member code and QR token
      const memberCode = generateMemberCode(branchCode);
      const qrToken = generateQRToken();

      // 3. Create member record linked to auth user
      const { error: memberError } = await supabase
        .from("members")
        .insert({
          church_id: branchInfo.church_id,
          branch_id: branchInfo.id,
          user_id: authData.user.id,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          gender: formData.gender as "male" | "female" || null,
          date_of_birth: formData.dateOfBirth || null,
          membership_status: (formData.membershipStatus as "member" | "visitor" | "new_convert") || "visitor",
          ministry_group: formData.ministryGroup.trim() || null,
          area_zone: formData.areaZone.trim() || null,
          member_code: memberCode,
          qr_code_token: qrToken,
          approval_status: "pending"
        });

      if (memberError) {
        // Cleanup: delete the auth user if member creation fails
        console.error("Member creation failed, auth user may need cleanup:", memberError);
        throw memberError;
      }

      // Sign out immediately - they need approval first
      await supabase.auth.signOut();

      setMemberResult({
        memberCode,
        branchName: branchInfo.name
      });
      setStep("success");

      toast({
        title: "Registration successful!",
        description: "Your account has been created and is pending approval.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (step === "success" && memberResult) {
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
              
              <h1 className="text-2xl font-bold text-foreground mb-2">Registration Complete!</h1>
              <p className="text-muted-foreground mb-6">
                You've registered to join {memberResult.branchName}
              </p>

              {/* Pending Approval Notice */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Pending Approval</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Your registration is awaiting approval from the church administrator. 
                  You'll be able to login once approved.
                </p>
              </div>

              <div className="bg-secondary/50 rounded-xl p-6 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Your Member Code</p>
                <p className="text-2xl font-mono font-bold text-primary">{memberResult.memberCode}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Save this code - you may need it for reference
                </p>
              </div>

              <div className="bg-primary/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>Login with your phone number + PIN after approval</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/member/login")}
                >
                  Go to Login
                </Button>
                <Link to="/">
                  <Button variant="ghost" size="lg" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
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
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
                <Church className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">ChurchFlow</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mb-2">Join Your Branch</h1>
            <p className="text-muted-foreground">
              {step === "code" 
                ? "Enter your branch code to get started" 
                : "Complete your registration & create account"}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-3 h-3 rounded-full ${step === "code" ? "bg-primary" : "bg-primary/30"}`} />
            <div className="w-8 h-0.5 bg-border" />
            <div className={`w-3 h-3 rounded-full ${step === "form" ? "bg-primary" : "bg-primary/30"}`} />
          </div>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            {step === "code" ? (
              <form onSubmit={handleCodeSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get your branch code from your church administrator or scan the branch QR code
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchCode">Branch Code</Label>
                  <Input
                    id="branchCode"
                    type="text"
                    placeholder="e.g., GCC-MAI-001"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    className="h-14 text-center text-lg font-mono tracking-wider"
                    required
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Continue"}
                  {!isLoading && <ChevronRight className="w-5 h-5" />}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button type="button" variant="outline" size="lg" className="w-full" disabled>
                  <QrCode className="w-5 h-5" />
                  Scan Branch QR Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {branchInfo && (
                  <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">Joining:</span>
                      <span className="text-muted-foreground">{branchInfo.name}</span>
                    </div>
                  </div>
                )}

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+233 XX XXX XXXX"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">This will be used for login</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="pl-10 h-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Church Information Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Church Information</h3>
                  
                  <div className="space-y-2">
                    <Label>Membership Status *</Label>
                    <Select
                      value={formData.membershipStatus}
                      onValueChange={(value) => setFormData({ ...formData, membershipStatus: value })}
                      required
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select your status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                        <SelectItem value="new_convert">New Convert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ministryGroup">Ministry/Group</Label>
                      <Input
                        id="ministryGroup"
                        name="ministryGroup"
                        type="text"
                        placeholder="e.g., Youth"
                        value={formData.ministryGroup}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="areaZone">Area/Zone</Label>
                      <Input
                        id="areaZone"
                        name="areaZone"
                        type="text"
                        placeholder="e.g., Zone 1"
                        value={formData.areaZone}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Security Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account Security</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pin">Create PIN *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="pin"
                        name="pin"
                        type={showPin ? "text" : "password"}
                        placeholder="••••"
                        value={formData.pin}
                        onChange={handleChange}
                        className="pl-10 pr-10 h-12"
                        minLength={4}
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
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
                    <p className="text-xs text-muted-foreground">4-6 digits for quick login</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">Confirm PIN *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPin"
                        name="confirmPin"
                        type={showPin ? "text" : "password"}
                        placeholder="••••"
                        value={formData.confirmPin}
                        onChange={handleChange}
                        className="pl-10 h-12"
                        minLength={4}
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Complete Registration"}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("code")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to branch code
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-muted-foreground">
                Already registered?{" "}
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
