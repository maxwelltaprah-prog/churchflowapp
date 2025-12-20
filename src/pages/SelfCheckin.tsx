import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Church, QrCode, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ServiceData {
  id: string;
  name: string;
  service_date: string;
  start_time: string | null;
  church_id: string;
  branch_id: string;
  churches?: { name: string } | null;
  branches?: { name: string } | null;
}

export default function SelfCheckin() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; name?: string } | null>(null);

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
      const { data, error: fetchError } = await supabase
        .from("services")
        .select("*, churches(name), branches(name)")
        .eq("id", serviceId)
        .eq("is_active", true)
        .single();

      if (fetchError || !data) {
        setError("Service not found or no longer active");
        return;
      }

      setService(data);
    } catch (err) {
      setError("Failed to load service");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!memberCode.trim() || !service) return;

    setChecking(true);
    setResult(null);

    try {
      // Find member by code or QR token
      const code = memberCode.trim();
      
      // Try to find by member_code first
      let { data: member } = await supabase
        .from("members")
        .select("id, full_name, branch_id, approval_status, is_active")
        .eq("church_id", service.church_id)
        .eq("member_code", code.toUpperCase())
        .single();

      // If not found, try qr_code_token
      if (!member) {
        const { data: memberByToken } = await supabase
          .from("members")
          .select("id, full_name, branch_id, approval_status, is_active")
          .eq("church_id", service.church_id)
          .eq("qr_code_token", code.toLowerCase())
          .single();
        member = memberByToken;
      }

      if (!member) {
        setResult({ success: false, message: "Member not found. Please check your code." });
        return;
      }

      if (!member.is_active) {
        setResult({ success: false, message: "Your membership is inactive. Please contact church staff." });
        return;
      }

      if (member.approval_status !== "approved") {
        setResult({ success: false, message: "Your membership is pending approval. Please contact church staff." });
        return;
      }

      // Check if already checked in
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("service_id", service.id)
        .eq("member_id", member.id)
        .single();

      if (existing) {
        setResult({ success: true, message: "You're already checked in!", name: member.full_name });
        return;
      }

      // Record attendance
      const isCrossBranch = member.branch_id !== service.branch_id;
      
      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          church_id: service.church_id,
          branch_id: service.branch_id,
          service_id: service.id,
          member_id: member.id,
          checkin_method: "self_scan",
          is_cross_branch: isCrossBranch,
          member_home_branch_id: isCrossBranch ? member.branch_id : null,
        });

      if (insertError) {
        console.error("Check-in error:", insertError);
        setResult({ success: false, message: "Failed to check in. Please try again or contact staff." });
        return;
      }

      setResult({ success: true, message: "Check-in successful!", name: member.full_name });
      setMemberCode("");
      toast.success("Checked in successfully!");

    } catch (err) {
      console.error("Check-in error:", err);
      setResult({ success: false, message: "An error occurred. Please try again." });
    } finally {
      setChecking(false);
    }
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
              <QrCode className="w-5 h-5 text-primary" />
              Self Check-in
            </CardTitle>
            <CardDescription>
              Enter your member code to check in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter your member code (e.g., CHU-12345)"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
                className="font-mono text-center text-lg"
                disabled={checking}
              />
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleCheckin}
              disabled={!memberCode.trim() || checking}
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

            <p className="text-xs text-center text-muted-foreground">
              Don't know your code? Ask a church staff member for help.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by Church Attendance
        </p>
      </div>
    </div>
  );
}
