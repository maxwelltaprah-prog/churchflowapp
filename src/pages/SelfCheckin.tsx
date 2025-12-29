import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Church, Hash, ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ServiceData {
  id: string;
  name: string;
  service_date: string;
  start_time: string | null;
  is_active?: boolean;
  churches?: { name: string } | null;
  branches?: { name: string } | null;
}

interface MemberMatch {
  id: string;
  full_name: string;
}

export default function SelfCheckin() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; name?: string } | null>(null);
  
  // Disambiguation state
  const [matchingMembers, setMatchingMembers] = useState<MemberMatch[]>([]);
  const [showDisambiguation, setShowDisambiguation] = useState(false);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    if (!serviceId) {
      setError("Invalid service link");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("self-checkin", {
        body: { action: "get_service", serviceId },
      });

      if (fnError) {
        console.error("get_service error", fnError);
        setError("Service not found or no longer active");
        return;
      }

      const serviceData = (data as any)?.service as ServiceData | undefined;
      if (!serviceData) {
        setError("Service not found or no longer active");
        return;
      }

      setService(serviceData);
    } catch (err) {
      setError("Failed to load service");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setMemberCode(value);
    // Reset disambiguation when code changes
    if (showDisambiguation) {
      setShowDisambiguation(false);
      setMatchingMembers([]);
    }
  };

  const handleCheckin = async (selectedMemberId?: string) => {
    if (memberCode.length !== 4 || !serviceId) return;

    setChecking(true);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("self-checkin", {
        body: {
          action: "checkin",
          serviceId,
          memberCode: memberCode.trim(),
          memberId: selectedMemberId, // Pass selected member if disambiguation
        },
      });

      if (fnError) {
        console.error("checkin error", fnError);
        setResult({ success: false, message: "Failed to check in. Please try again." });
        return;
      }

      const status = (data as any)?.status as string | undefined;
      const name = (data as any)?.name as string | undefined;
      const members = (data as any)?.members as MemberMatch[] | undefined;

      // Handle disambiguation case
      if (status === "disambiguation_required" && members) {
        setMatchingMembers(members);
        setShowDisambiguation(true);
        setChecking(false);
        return;
      }

      if (status === "checked_in") {
        setResult({ success: true, message: "Check-in successful!", name });
        setMemberCode("");
        setShowDisambiguation(false);
        setMatchingMembers([]);
        toast.success("Checked in successfully!");
        return;
      }

      if (status === "already_checked_in") {
        setResult({ success: true, message: "You're already checked in!", name });
        setShowDisambiguation(false);
        setMatchingMembers([]);
        return;
      }

      const errMsg = (data as any)?.error as string | undefined;
      setResult({ success: false, message: errMsg || "Unable to check in." });
    } catch (err) {
      console.error("Check-in error:", err);
      setResult({ success: false, message: "An error occurred. Please try again." });
    } finally {
      setChecking(false);
    }
  };

  const handleSelectMember = (memberId: string) => {
    handleCheckin(memberId);
  };

  const handleCancelDisambiguation = () => {
    setShowDisambiguation(false);
    setMatchingMembers([]);
    setMemberCode("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle>Unable to Load Service</CardTitle>
            <CardDescription>{error || "Service not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        {/* Church Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Church className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {service.churches?.name || "Church"}
          </h1>
        </div>

        {/* Service Info Card */}
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">{service.name}</CardTitle>
            <CardDescription>
              {format(new Date(service.service_date), "EEEE, MMMM d, yyyy")}
              {service.start_time && ` • ${service.start_time}`}
            </CardDescription>
            {service.branches?.name && (
              <p className="text-xs text-muted-foreground">{service.branches.name}</p>
            )}
          </CardHeader>
        </Card>

        {/* Check-in Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Self Check-in
            </CardTitle>
            <CardDescription>
              Enter your member code to check in quickly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showDisambiguation ? (
              <>
                <div className="space-y-2">
                  <Input
                    placeholder="Last 4 digits of your phone number"
                    value={memberCode}
                    onChange={handleMemberCodeChange}
                    onKeyDown={(e) => e.key === "Enter" && memberCode.length === 4 && handleCheckin()}
                    className="text-center text-2xl font-mono tracking-[0.5em] h-14"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    disabled={checking}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    No PIN required for check-in
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleCheckin()}
                  disabled={memberCode.length !== 4 || checking}
                >
                  {checking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Check In
                    </>
                  )}
                </Button>
              </>
            ) : (
              /* Disambiguation UI */
              <div className="space-y-4">
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Multiple members found</p>
                  <p className="text-xs text-muted-foreground">Please select your name below</p>
                </div>
                
                <div className="space-y-2">
                  {matchingMembers.map((member) => (
                    <Button
                      key={member.id}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => handleSelectMember(member.id)}
                      disabled={checking}
                    >
                      <div className="text-left">
                        <p className="font-medium">{member.full_name}</p>
                      </div>
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={handleCancelDisambiguation}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Enter different code
                </Button>
              </div>
            )}

            {/* Result Message */}
            {result && (
              <div className={`p-4 rounded-lg text-center ${
                result.success 
                  ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                  : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
              }`}>
                {result.success ? (
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
                ) : (
                  <XCircle className="w-12 h-12 mx-auto text-red-600 mb-2" />
                )}
                {result.name && (
                  <p className="font-semibold text-lg text-foreground mb-1">
                    Welcome, {result.name}!
                  </p>
                )}
                <p className={result.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                  {result.message}
                </p>
              </div>
            )}

            {!showDisambiguation && (
              <p className="text-xs text-center text-muted-foreground">
                Don't know your code? It's the last 4 digits of your registered phone number.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by ChurchFlow
        </p>
      </div>
    </div>
  );
}
