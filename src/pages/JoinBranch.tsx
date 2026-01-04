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
  User, 
  Phone, 
  ChevronRight,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { generateMemberCode, generateQRToken } from "@/lib/church-service";
import { selfRegisterSchema, type SelfRegisterFormData } from "@/lib/member-form-schema";

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

export default function JoinBranch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get("code") || "";
  
  const [step, setStep] = useState<"code" | "form" | "success">(initialCode ? "form" : "code");
  const [branchCode, setBranchCode] = useState(initialCode);
  const [branchInfo, setBranchInfo] = useState<{ id: string; church_id: string; name: string } | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);
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
      membership_status: "first_timer",
      group_ids: [],
      member_type: null,
      how_heard: null,
      residential_area: "",
      marital_status: null,
      occupation: null,
      email: "",
      pin: "",
      confirmPin: "",
    },
  });

  // Fetch groups when branch is set
  useEffect(() => {
    if (branchInfo?.id) {
      fetchBranchGroups(branchInfo.id).then(setAvailableGroups);
    }
  }, [branchInfo?.id]);

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
      // Check if phone already exists in this church
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("phone", data.phone.trim())
        .eq("church_id", branchInfo.church_id)
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

      // Create auth account
      const authEmail = `${data.phone.replace(/[^0-9]/g, "")}@churchflow.member`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password: data.pin,
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

      // Create member record
      const memberInsertData: Record<string, unknown> = {
        church_id: branchInfo.church_id,
        branch_id: branchInfo.id,
        user_id: authData.user.id,
        full_name: data.full_name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        membership_status: data.membership_status,
        member_type: data.member_type || null,
        how_heard: data.how_heard || null,
        residential_area: data.residential_area?.trim() || null,
        marital_status: data.marital_status || null,
        occupation: data.occupation || null,
        member_code: memberCode,
        qr_code_token: qrToken,
        approval_status: "pending",
        date_joined: new Date().toISOString().split("T")[0],
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

                  {/* Time estimate */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                    <Clock className="w-4 h-4" />
                    <span>Takes about 1 minute</span>
                  </div>

                  {/* SECTION A: Basic Info (Required) */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Basic Information
                    </h3>

                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="+233 XX XXX XXXX" 
                              className="h-12" 
                              {...field} 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">This will be used for login</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <FormControl>
                              <Input type="date" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="membership_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="first_timer">First Timer / New</SelectItem>
                              <SelectItem value="visitor">Visitor</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Account Security Section */}
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
                                maxLength={6}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
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
                          <p className="text-xs text-muted-foreground">4-6 digits for quick login</p>
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
                              maxLength={6}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* OPTIONAL SECTIONS (Collapsed) */}
                  <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-between h-12 border border-dashed border-border hover:border-primary/50"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          Add more details (optional)
                        </span>
                        {optionalOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 pt-4">
                      {/* Church Connection */}
                      <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground">Church Connection</h4>

                        {availableGroups.length > 0 && (
                          <FormField
                            control={form.control}
                            name="group_ids"
                            render={() => (
                              <FormItem>
                                <FormLabel>Ministry / Group</FormLabel>
                                <div className="border rounded-md p-3 space-y-2 max-h-[120px] overflow-y-auto bg-background">
                                  {availableGroups.map((group) => (
                                    <FormField
                                      key={group.id}
                                      control={form.control}
                                      name="group_ids"
                                      render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(group.id)}
                                              onCheckedChange={(checked) => {
                                                const currentValue = field.value || [];
                                                if (checked) {
                                                  field.onChange([...currentValue, group.id]);
                                                } else {
                                                  field.onChange(
                                                    currentValue.filter((id) => id !== group.id)
                                                  );
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal cursor-pointer">
                                            {group.name}
                                          </FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="member_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Member Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="regular">Regular Attender</SelectItem>
                                  <SelectItem value="occasional">Occasional Attender</SelectItem>
                                  <SelectItem value="worker">Worker / Volunteer</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="how_heard"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>How did you hear about us?</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="friend_family">Friend / Family</SelectItem>
                                  <SelectItem value="social_media">Social Media</SelectItem>
                                  <SelectItem value="walk_in">Walk-in</SelectItem>
                                  <SelectItem value="outreach">Outreach</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Location & Life Stage */}
                      <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground">Location & Life Stage</h4>

                        <FormField
                          control={form.control}
                          name="residential_area"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Residential Area</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., East Legon, Accra" 
                                  className="h-12" 
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="marital_status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Marital Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="single">Single</SelectItem>
                                    <SelectItem value="married">Married</SelectItem>
                                    <SelectItem value="divorced">Divorced</SelectItem>
                                    <SelectItem value="widowed">Widowed</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="occupation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Occupation</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="public_sector">Public Sector</SelectItem>
                                    <SelectItem value="private_sector">Private Sector</SelectItem>
                                    <SelectItem value="self_employed">Self-Employed</SelectItem>
                                    <SelectItem value="unemployed">Unemployed</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="email@example.com" 
                                  className="h-12" 
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

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
              </Form>
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
