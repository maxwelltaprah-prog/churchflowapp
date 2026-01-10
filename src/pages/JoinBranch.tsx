import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Church, 
  ArrowLeft, 
  QrCode, 
  Phone, 
  ChevronRight,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { generateMemberCode, generateQRToken } from "@/lib/church-service";
import { selfRegisterSchema, type SelfRegisterFormData } from "@/lib/member-form-schema";
import { padPin } from "@/lib/pin-utils";
import { MemberForm } from "@/components/member/MemberForm";

// Fetch groups for a branch
async function fetchBranchGroups(branchId: string) {
  const { data } = await supabase
    .from("groups")
    .select("id, name")
    .eq("is_active", true)
    .or(`branch_id.eq.${branchId},branch_id.is.null`)
    .order("sort_order");
  return data || [];
}

// Fetch active spiritual journeys for a church
async function fetchChurchSpiritualJourneys(churchId: string) {
  const { data } = await supabase
    .from("spiritual_journeys")
    .select("id, name")
    .eq("church_id", churchId)
    .eq("is_active", true)
    .order("sort_order");
  return data || [];
}

export default function JoinBranch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get("code") || "";
  
  const [step, setStep] = useState<"code" | "form" | "success">(initialCode ? "form" : "code");
  const [branchCode, setBranchCode] = useState(initialCode);
  const [branchInfo, setBranchInfo] = useState<{ id: string; church_id: string; name: string } | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);
  const [availableSpiritualJourneys, setAvailableSpiritualJourneys] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memberResult, setMemberResult] = useState<{ memberCode: string; branchName: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<SelfRegisterFormData>({
    resolver: zodResolver(selfRegisterSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      gender: undefined,
      date_of_birth: "",
      day_born: null,
      membership_status: "active",
      group_ids: [],
      spiritual_journey_ids: [],
      how_heard: null,
      residential_area: "",
      marital_status: null,
      occupation: null,
      email: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      pin: "",
      confirmPin: "",
      date_joined: new Date().toISOString().split("T")[0],
    },
  });

  // Fetch groups and spiritual journeys when branch is set
  useEffect(() => {
    if (branchInfo?.id) {
      fetchBranchGroups(branchInfo.id).then(setAvailableGroups);
    }
    if (branchInfo?.church_id) {
      fetchChurchSpiritualJourneys(branchInfo.church_id).then(setAvailableSpiritualJourneys);
    }
  }, [branchInfo?.id, branchInfo?.church_id]);

  // Auto-validate branch code if provided in URL
  useEffect(() => {
    if (initialCode && !branchInfo) {
      validateBranchCode(initialCode);
    }
  }, [initialCode]);

  const validateBranchCode = async (code: string) => {
    setIsLoading(true);
    try {
      const normalizedCode = code.trim().toUpperCase();
      // Use secure database function that only returns safe branch data
      const { data: branchData, error } = await supabase
        .rpc("get_branch_for_joining", { p_join_code: normalizedCode })
        .maybeSingle();

      if (error) throw error;
      if (!branchData) {
        toast({
          title: "Branch not found",
          description: "Please check the code and try again.",
          variant: "destructive",
        });
        setStep("code");
        return;
      }

      setBranchInfo({
        id: branchData.id,
        church_id: branchData.church_id,
        name: branchData.name,
      });
      setStep("form");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setStep("code");
    } finally {
      setIsLoading(false);
    }
  };

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
    await validateBranchCode(branchCode);
  };

  const onSubmit = async (data: SelfRegisterFormData) => {
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
      // Check if phone already exists in this church using secure edge function
      const checkResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-phone-exists`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ 
            phone: data.phone.trim(), 
            church_id: branchInfo.church_id 
          }),
        }
      );

      const checkResult = await checkResponse.json();

      if (checkResult.exists) {
        toast({
          title: "Phone number already registered",
          description: "This phone number is already registered. Please login instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create auth account
      const authEmail = `${data.phone.replace(/[^0-9]/g, "")}@churchflow.member`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password: padPin(data.pin),
        options: {
          emailRedirectTo: `${window.location.origin}/member`,
          data: { 
            full_name: data.full_name,
            is_member: true
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Generate member code and QR token
      const memberCode = generateMemberCode(branchCode);
      const qrToken = generateQRToken();

      // Create member record with all fields from form
      const memberInsertData: Record<string, unknown> = {
        church_id: branchInfo.church_id,
        branch_id: branchInfo.id,
        user_id: authData.user.id,
        full_name: data.full_name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        day_born: data.day_born || null,
        membership_status: data.membership_status,
        how_heard: data.how_heard || null,
        residential_area: data.residential_area?.trim() || null,
        marital_status: data.marital_status || null,
        occupation: data.occupation || null,
        emergency_contact_name: data.emergency_contact_name?.trim() || null,
        emergency_contact_phone: data.emergency_contact_phone?.trim() || null,
        emergency_contact_relationship: data.emergency_contact_relationship?.trim() || null,
        member_code: memberCode,
        qr_code_token: qrToken,
        approval_status: "pending",
        date_joined: data.date_joined || new Date().toISOString().split("T")[0],
      };

      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert(memberInsertData as any)
        .select("id")
        .single();

      if (memberError) {
        console.error("Member creation failed:", memberError);
        throw memberError;
      }

      // Add member to groups if selected
      if (data.group_ids && data.group_ids.length > 0 && newMember) {
        const groupInserts = data.group_ids.map((groupId) => ({
          member_id: newMember.id,
          group_id: groupId,
        }));
        await supabase.from("member_groups").insert(groupInserts);
      }

      // Add member spiritual journeys
      if (data.spiritual_journey_ids && data.spiritual_journey_ids.length > 0 && newMember) {
        const journeyInserts = data.spiritual_journey_ids.map((journeyId) => ({
          member_id: newMember.id,
          spiritual_journey_id: journeyId,
        }));
        await supabase.from("member_spiritual_journeys").insert(journeyInserts);
      }

      // Sign out - they need approval first
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

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-6 sm:p-8">
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
                  <label htmlFor="branchCode" className="text-sm font-medium">Branch Code</label>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {branchInfo && (
                    <div className="bg-secondary/50 rounded-lg p-3 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-medium">Joining:</span>
                        <span className="text-muted-foreground">{branchInfo.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Use the shared MemberForm component */}
                  <MemberForm
                    form={form}
                    availableGroups={availableGroups}
                    availableSpiritualJourneys={availableSpiritualJourneys}
                    mode="self-register"
                    showAdminFields={false}
                  />

                  {/* Account Security Section - PIN fields */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Account Security
                    </h3>

                    <FormField
                      control={form.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Create PIN *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPin ? "text" : "password"}
                                placeholder="••••"
                                className="h-12 pr-10"
                                maxLength={4}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">4 digits for quick login</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm PIN *</FormLabel>
                          <FormControl>
                            <Input
                              type={showPin ? "text" : "password"}
                              placeholder="••••"
                              className="h-12"
                              maxLength={4}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setStep("code");
                        setBranchInfo(null);
                        form.reset();
                      }}
                    >
                      Back
                    </Button>
                    <Button type="submit" variant="hero" disabled={isLoading}>
                      {isLoading ? "Registering..." : "Complete Registration"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

          {/* Login link */}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/member/login" className="text-primary hover:underline font-medium">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
