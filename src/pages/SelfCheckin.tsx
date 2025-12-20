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
  is_active?: boolean;
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

  const handleCheckin = async () => {
    if (!memberCode.trim() || !serviceId) return;

    setChecking(true);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("self-checkin", {
        body: {
          action: "checkin",
          serviceId,
          memberCode: memberCode.trim(),
        },
      });

      if (fnError) {
        console.error("checkin error", fnError);
        setResult({ success: false, message: "Failed to check in. Please try again." });
        return;
      }

      const status = (data as any)?.status as string | undefined;
      const name = (data as any)?.name as string | undefined;

      if (status === "checked_in") {
        setResult({ success: true, message: "Check-in successful!", name });
        setMemberCode("");
        toast.success("Checked in successfully!");
        return;
      }

      if (status === "already_checked_in") {
        setResult({ success: true, message: "You're already checked in!", name });
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
