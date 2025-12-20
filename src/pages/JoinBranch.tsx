import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Church, 
  ArrowLeft, 
  QrCode, 
  User, 
  Phone, 
  Users,
  ChevronRight,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function JoinBranch() {
  const [step, setStep] = useState<"code" | "form">("code");
  const [branchCode, setBranchCode] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "",
    membershipStatus: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (branchCode.length < 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid branch code.",
        variant: "destructive",
      });
      return;
    }
    setStep("form");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      toast({
        title: "Coming Soon",
        description: "Member registration will be available once the backend is connected.",
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                : "Complete your registration"}
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
                    placeholder="e.g., GCC-TAK-001"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    className="h-14 text-center text-lg font-mono tracking-wider"
                    required
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full">
                  Continue
                  <ChevronRight className="w-5 h-5" />
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
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-medium">Joining:</span>
                    <span className="text-muted-foreground">Grace Community - Takoradi Branch</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
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
                  <Label htmlFor="phone">Phone Number</Label>
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
                    <Label>Status</Label>
                    <Select
                      value={formData.membershipStatus}
                      onValueChange={(value) => setFormData({ ...formData, membershipStatus: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                        <SelectItem value="new_convert">New Convert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Registering..." : "Complete Registration"}
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
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* QR Code preview after registration (future) */}
          {step === "form" && (
            <div className="mt-8 text-center">
              <div className="bg-card rounded-xl border border-border p-6 inline-block">
                <QrCode className="w-24 h-24 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-3">
                  Your personal QR code will appear here after registration
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
