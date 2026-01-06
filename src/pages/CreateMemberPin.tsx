import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, ArrowLeft, Eye, EyeOff, Phone, Lock, KeyRound, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CreateMemberPin() {
  const [step, setStep] = useState<"phone" | "pin" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [memberData, setMemberData] = useState<{ id: string; full_name: string; phone: string } | null>(null);
  const navigate = useNavigate();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 15);
    setPhone(value);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setConfirmPin(value);
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phone.length < 9) {
      toast.error("Please enter your full phone number (at least 9 digits)");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = phone.replace(/\D/g, "");
      
      // Find member by phone who doesn't have a user_id yet
      const { data: members, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, phone, approval_status, user_id")
        .eq("is_active", true);

      if (memberError) throw memberError;

      // Filter to find member with matching phone
      const matchedMember = members?.find(m => {
        const memberPhone = m.phone?.replace(/\D/g, "") || "";
        return memberPhone === normalizedPhone || 
               memberPhone.endsWith(normalizedPhone) || 
               normalizedPhone.endsWith(memberPhone);
      });

      if (!matchedMember) {
        toast.error("No member found with this phone number. Please contact your church administrator.");
        return;
      }

      // Check if already has account
      if (matchedMember.user_id) {
        toast.error("You already have an account. Please use the Sign In page instead.");
        return;
      }

      // Check approval status
      if (matchedMember.approval_status === "pending") {
        toast.error("Your membership is still pending approval. Please wait for an administrator to approve your registration.");
        return;
      }

      if (matchedMember.approval_status === "rejected") {
        toast.error("Your membership application was not approved. Please contact your church administrator.");
        return;
      }

      if (!matchedMember.phone) {
        toast.error("Phone number not found in your record. Please contact your church administrator.");
        return;
      }

      setMemberData({
        id: matchedMember.id,
        full_name: matchedMember.full_name,
        phone: matchedMember.phone,
      });
      setStep("pin");
      toast.success(`Welcome, ${matchedMember.full_name}! Now create your PIN.`);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberData) return;

    if (pin.length < 6) {
      toast.error("PIN must be at least 6 digits");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }

    setIsLoading(true);

    try {
      const authEmail = `${memberData.phone.replace(/[^0-9]/g, "")}@churchflow.member`;
      
      // Create Supabase auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password: pin,
        options: {
          emailRedirectTo: `${window.location.origin}/member`,
          data: {
            full_name: memberData.full_name,
            is_member: true,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Update member record with user_id
      const { error: updateError } = await supabase
        .from("members")
        .update({ user_id: authData.user.id })
        .eq("id", memberData.id);

      if (updateError) throw updateError;

      setStep("success");
      toast.success("PIN created successfully!");
    } catch (error: any) {
      console.error("Error creating PIN:", error);
      if (error.message?.includes("already registered")) {
        toast.error("An account already exists for this phone number. Try signing in instead.");
      } else {
        toast.error(error.message || "Failed to create PIN");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/member-login");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="container pt-6">
        <Link
          to="/member-login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
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
              <KeyRound className="w-4 h-4" />
              Create PIN
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {step === "phone" && "Set Up Your Account"}
              {step === "pin" && "Create Your PIN"}
              {step === "success" && "You're All Set!"}
            </h1>
            <p className="text-muted-foreground">
              {step === "phone" && "Enter your phone number to get started"}
              {step === "pin" && `Welcome, ${memberData?.full_name}!`}
              {step === "success" && "Your PIN has been created successfully"}
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            {step === "phone" && (
              <form onSubmit={handleVerifyPhone} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="pl-10 h-12 text-lg font-mono tracking-wide"
                      maxLength={15}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number registered by your church
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || phone.length < 9}
                >
                  {isLoading ? "Verifying..." : "Continue"}
                </Button>
              </form>
            )}

            {step === "pin" && (
              <form onSubmit={handleCreatePin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pin">New PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      placeholder="Enter 6-digit PIN"
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
                  <p className="text-xs text-muted-foreground">Minimum 6 digits</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirm PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPin"
                      type={showPin ? "text" : "password"}
                      placeholder="Confirm your PIN"
                      value={confirmPin}
                      onChange={handleConfirmPinChange}
                      className="pl-10 h-12 text-center text-lg font-mono tracking-widest"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || pin.length < 6 || confirmPin.length < 6}
                >
                  {isLoading ? "Creating..." : "Create PIN"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setPin("");
                    setConfirmPin("");
                    setMemberData(null);
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Use a different phone number
                </button>
              </form>
            )}

            {step === "success" && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-foreground font-medium">
                    Your PIN has been created!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with your phone number and PIN.
                  </p>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handleGoToLogin}
                >
                  Sign In Now
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have a PIN?{" "}
              <Link to="/member-login" className="text-primary font-medium hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
