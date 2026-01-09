import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Church, Phone, ArrowLeft, Users, Download, FileText, Music, Clock, ArrowUpRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { ServiceUpload } from "@/hooks/useServiceUploads";
import { downloadFileFromUrl } from "@/lib/file-download";

interface ServiceData {
  id: string;
  name: string;
  service_date: string;
  start_time: string | null;
  is_active?: boolean;
  churches?: { name: string } | null;
  branches?: { name: string } | null;
}

interface PersonMatch {
  id: string;
  full_name: string;
  type: "member" | "visitor";
}

type UserType = "member" | "visitor";

export default function SelfCheckin() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; name?: string } | null>(null);
  
  // Disambiguation state
  const [matchingPeople, setMatchingPeople] = useState<PersonMatch[]>([]);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  
  // Downloads state
  const downloadsRef = useRef<HTMLDivElement | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [serviceUploads, setServiceUploads] = useState<ServiceUpload[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [checkedInMemberId, setCheckedInMemberId] = useState<string | null>(null);
  const [checkedInVisitorId, setCheckedInVisitorId] = useState<string | null>(null);
  const [checkedInUserType, setCheckedInUserType] = useState<UserType | null>(null);

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 15);
    setPhone(value);
    if (showDisambiguation) {
      setShowDisambiguation(false);
      setMatchingPeople([]);
    }
  };

  const handleCheckin = async (selectedId?: string, selectedType?: UserType) => {
    if (phone.length < 9 || !serviceId) return;

    setChecking(true);
    setResult(null);

    try {
      const body: any = {
        action: "unified_checkin",
        serviceId,
        phone: phone.trim(),
      };

      if (selectedId && selectedType) {
        body.selectedId = selectedId;
        body.selectedType = selectedType;
      }

      const { data, error: fnError } = await supabase.functions.invoke("self-checkin", { body });

      if (fnError) {
        console.error("checkin error", fnError);
        setResult({ success: false, message: "Failed to check in. Please try again." });
        return;
      }

      const status = (data as any)?.status as string | undefined;
      const name = (data as any)?.name as string | undefined;
      const matches = (data as any)?.matches as PersonMatch[] | undefined;
      const userType = (data as any)?.userType as UserType | undefined;

      if (status === "disambiguation_required" && matches) {
        setMatchingPeople(matches);
        setShowDisambiguation(true);
        setChecking(false);
        return;
      }

      if (status === "checked_in" || status === "already_checked_in") {
        const isAlreadyIn = status === "already_checked_in";
        setResult({ 
          success: true, 
          message: isAlreadyIn ? "You're already checked in!" : "Check-in successful!", 
          name 
        });

        const memberIdFromFn = (data as any)?.memberId as string | undefined;
        const visitorIdFromFn = (data as any)?.visitorId as string | undefined;
        
        setCheckedInMemberId(memberIdFromFn ?? null);
        setCheckedInVisitorId(visitorIdFromFn ?? null);
        setCheckedInUserType(userType ?? null);

        setPhone("");
        setShowDisambiguation(false);
        setMatchingPeople([]);
        if (!isAlreadyIn) {
          toast.success("Checked in successfully!");
        }

        setShowDownloads(true);
        setServiceUploads([]);
        loadServiceDownloads(memberIdFromFn, visitorIdFromFn, userType);
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

  const loadServiceDownloads = async (memberId?: string, visitorId?: string, type?: UserType) => {
    if (!serviceId) return;

    const effectiveMemberId = memberId ?? checkedInMemberId;
    const effectiveVisitorId = visitorId ?? checkedInVisitorId;
    const effectiveType = type ?? checkedInUserType;

    if (!effectiveMemberId && !effectiveVisitorId) return;
    
    setLoadingDownloads(true);
    try {
      const body: any = { action: "get_downloads", serviceId };
      if (effectiveType === "member" && effectiveMemberId) {
        body.memberId = effectiveMemberId;
      } else if (effectiveType === "visitor" && effectiveVisitorId) {
        body.visitorId = effectiveVisitorId;
      }

      const { data, error } = await supabase.functions.invoke("self-checkin", { body });

      if (error) {
        console.error("get_downloads error", error);
        setServiceUploads([]);
        setShowDownloads(true);
        return;
      }

      const uploads = (data as any)?.uploads as ServiceUpload[] | undefined;
      setServiceUploads(uploads || []);
      setShowDownloads(true);

      window.setTimeout(() => {
        downloadsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      console.error("Error loading downloads:", err);
      setServiceUploads([]);
      setShowDownloads(true);
    } finally {
      setLoadingDownloads(false);
    }
  };

  const handleOpen = async (upload: ServiceUpload) => {
    if (!serviceId || (!checkedInMemberId && !checkedInVisitorId)) return;

    const win = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      const body: any = {
        action: "get_download_url",
        serviceId,
        uploadId: upload.id,
      };
      if (checkedInUserType === "member" && checkedInMemberId) {
        body.memberId = checkedInMemberId;
      } else if (checkedInUserType === "visitor" && checkedInVisitorId) {
        body.visitorId = checkedInVisitorId;
      }

      const { data, error } = await supabase.functions.invoke("self-checkin", { body });

      if (error || !(data as any)?.signedUrl) {
        win?.close();
        toast.error("This file is not available.");
        return;
      }

      const signedUrl = (data as any).signedUrl as string;
      if (win) win.location.href = signedUrl;
      else window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      win?.close();
      console.error("Open error:", err);
      toast.error("Failed to open file");
    }
  };

  const handleDownload = async (upload: ServiceUpload) => {
    if (!serviceId || (!checkedInMemberId && !checkedInVisitorId)) return;

    setDownloading(upload.id);
    setDownloadProgress((prev) => ({ ...prev, [upload.id]: 0 }));

    try {
      const body: any = {
        action: "get_download_url",
        serviceId,
        uploadId: upload.id,
      };
      if (checkedInUserType === "member" && checkedInMemberId) {
        body.memberId = checkedInMemberId;
      } else if (checkedInUserType === "visitor" && checkedInVisitorId) {
        body.visitorId = checkedInVisitorId;
      }

      const { data, error } = await supabase.functions.invoke("self-checkin", { body });

      if (error || !(data as any)?.signedUrl) {
        toast.error("This file is not available.");
        return;
      }

      const signedUrl = (data as any).signedUrl as string;

      await downloadFileFromUrl(signedUrl, upload.file_name, (pct) =>
        setDownloadProgress((prev) => ({ ...prev, [upload.id]: pct })),
      );

      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    if (expiry <= now) return null;
    return formatDistanceToNow(expiry, { addSuffix: false });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSelectPerson = (person: PersonMatch) => {
    handleCheckin(person.id, person.type);
  };

  const handleCancelDisambiguation = () => {
    setShowDisambiguation(false);
    setMatchingPeople([]);
    setPhone("");
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
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Self Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your phone number to check in
            </p>
            
            {!showDisambiguation ? (
              <>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => e.key === "Enter" && phone.length >= 9 && handleCheckin()}
                    className="text-center text-xl font-mono tracking-wide h-14"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    disabled={checking}
                  />
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleCheckin()}
                  disabled={phone.length < 9 || checking}
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
              <div className="space-y-4">
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Multiple matches found</p>
                  <p className="text-xs text-muted-foreground">Please select your name below</p>
                </div>
                
                <div className="space-y-2">
                  {matchingPeople.map((person) => (
                    <Button
                      key={`${person.type}-${person.id}`}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => handleSelectPerson(person)}
                      disabled={checking}
                    >
                      <div className="text-left">
                        <p className="font-medium">{person.full_name}</p>
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
                  Enter different number
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

            {/* Service Downloads Section */}
            {showDownloads && (
              <div ref={downloadsRef} className="space-y-3 border-t pt-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Download className={serviceUploads.length > 0 ? "w-5 h-5 animate-pulse" : "w-5 h-5"} />
                    <h3 className="font-semibold">Service Downloads</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {serviceUploads.length > 0
                      ? "Tap Open to view in your browser, or Download to save it. Available for 48 hours."
                      : "No downloads available for this service."}
                  </p>
                </div>

                {loadingDownloads && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loadingDownloads && serviceUploads.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No downloads available for this service.
                  </p>
                )}

                {serviceUploads.map((upload) => {
                  const timeRemaining = getTimeRemaining(upload.expires_at);

                  return (
                    <div key={upload.id} className="rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3 p-3">
                        {upload.upload_type === "program" ? (
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                        ) : (
                          <Music className="w-5 h-5 text-primary shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {upload.upload_type === "program" ? "Church Program" : "Sermon Audio"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(upload.file_size)}</span>
                            {timeRemaining && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {timeRemaining} left
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpen(upload)}
                            disabled={downloading === upload.id}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(upload)}
                            disabled={downloading === upload.id}
                          >
                            {downloading === upload.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {downloading === upload.id && (
                        <div className="px-3 pb-3 space-y-2">
                          <Progress value={downloadProgress[upload.id] ?? 0} />
                          <p className="text-[11px] text-muted-foreground text-right">
                            {downloadProgress[upload.id] ?? 0}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!showDisambiguation && !result && (
              <p className="text-xs text-center text-muted-foreground">
                Use your registered phone number to check in.
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
