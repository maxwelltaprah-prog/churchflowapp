import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Church, 
  LogOut, 
  QrCode, 
  Copy,
  Check,
  User,
  Clock,
  Calendar,
  Download,
  FileText,
  Music,
  Loader2,
  ArrowUpRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { StreakDashboard } from "@/components/member/StreakDashboard";
import { RecentServicesStreak } from "@/components/member/RecentServicesStreak";
import { MemberTitheStats } from "@/components/member/MemberTitheStats";
import { useMemberServiceDownloads, getDownloadUrl, MemberDownload } from "@/hooks/useServiceUploads";
import { downloadFileFromUrl } from "@/lib/file-download";

interface MemberData {
  id: string;
  full_name: string;
  member_code: string;
  qr_code_token: string;
  phone: string | null;
  email: string | null;
  branches: { name: string } | null;
  churches: { name: string } | null;
}

interface AttendanceStats {
  totalAttendance: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthCount: number;
  lastAttendance: string | null;
}

interface ChurchService {
  id: string;
  name: string;
  service_date: string;
  branches: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  checked_in_at: string;
  services: {
    name: string;
    service_date: string;
    start_time: string | null;
    branches: { name: string } | null;
  } | null;
}

export default function MemberPortal() {
  const [member, setMember] = useState<MemberData | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [churchServices, setChurchServices] = useState<ChurchService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  
  // Fetch downloads for this member
  const { data: memberDownloads, isLoading: downloadsLoading } = useMemberServiceDownloads(member?.id);

  useEffect(() => {
    fetchMemberData();
  }, []);

  // Real-time subscription for attendance updates
  useEffect(() => {
    if (!member?.id) return;

    const channel = supabase
      .channel('member-attendance')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `member_id=eq.${member.id}`
        },
        async (payload) => {
          console.log('New attendance detected:', payload);
          // Fetch the full attendance record with service details
          const { data: newRecord } = await supabase
            .from("attendance")
            .select("id, checked_in_at, services(name, service_date, start_time, branches(name))")
            .eq("id", payload.new.id)
            .single();

          if (newRecord && newRecord.services) {
            setAttendanceHistory(prev => {
              const updated = [newRecord as AttendanceRecord, ...prev];
              const newStats = calculateStreakStats(updated, churchServices);
              setStats(newStats);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member?.id, attendanceHistory, churchServices]);

  const fetchMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/member/login");
        return;
      }

      // Fetch member data with church_id and branch_id
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, member_code, qr_code_token, phone, email, church_id, branch_id, branches(name), churches(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData) {
        navigate("/member/login");
        return;
      }

      setMember(memberData as MemberData);

      // Fetch all services for the member's church (sorted by date descending)
      const { data: allServices } = await supabase
        .from("services")
        .select("id, name, service_date, branches(name)")
        .eq("church_id", memberData.church_id)
        .eq("is_active", true)
        .lte("service_date", new Date().toISOString().split('T')[0]) // Only past/today services
        .order("service_date", { ascending: false })
        .limit(20); // Get recent 20 services for streak display

      const services = allServices || [];
      setChurchServices(services);

      // Fetch attendance stats and history with service details
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          id, 
          checked_in_at, 
          service_id,
          services!inner(
            name, 
            service_date, 
            start_time, 
            branches(name)
          )
        `)
        .eq("member_id", memberData.id)
        .order("checked_in_at", { ascending: false });
      
      console.log("Attendance data:", attendanceData, "Error:", attendanceError);

      if (attendanceData) {
        const stats = calculateStreakStats(attendanceData, services);
        setStats(stats);
        setAttendanceHistory(attendanceData as AttendanceRecord[]);
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreakStats = (attendanceData: any[], allServices: ChurchService[]): AttendanceStats => {
    // Get attended service IDs as a Set for quick lookup
    const attendedServiceIds = new Set(
      attendanceData.map(a => a.service_id).filter(Boolean)
    );

    // Get unique attended service dates for display stats
    const attendedDates = [...new Set(
      attendanceData.map(a => a.services?.service_date).filter(Boolean)
    )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (!allServices.length) {
      return {
        totalAttendance: attendedDates.length,
        currentStreak: 0,
        longestStreak: 0,
        thisMonthCount: attendedDates.filter(d => {
          const date = new Date(d);
          return date.getMonth() === new Date().getMonth() && 
                 date.getFullYear() === new Date().getFullYear();
        }).length,
        lastAttendance: attendedDates[0] || null
      };
    }

    // Sort all services from most recent to oldest
    const sortedServices = [...allServices].sort(
      (a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
    );

    // Calculate current streak: count consecutive services attended from most recent
    let currentStreak = 0;
    for (const service of sortedServices) {
      if (attendedServiceIds.has(service.id)) {
        currentStreak++;
      } else {
        // First missed service breaks the streak
        break;
      }
    }

    // Calculate longest streak: find the longest run of consecutive attended services
    let longestStreak = 0;
    let tempStreak = 0;
    for (const service of sortedServices) {
      if (attendedServiceIds.has(service.id)) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // This month count
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthCount = attendedDates.filter(d => {
      const date = new Date(d);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;

    return {
      totalAttendance: attendedDates.length,
      currentStreak,
      longestStreak,
      thisMonthCount,
      lastAttendance: attendedDates[0] || null
    };
  };

  const handleCopyCode = () => {
    if (member) {
      navigator.clipboard.writeText(member.member_code);
      setCopied(true);
      toast.success("Member code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleOpen = async (upload: MemberDownload) => {
    // Open a placeholder window immediately to avoid popup blockers on mobile
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      const url = await getDownloadUrl(upload.storage_path);
      if (!url) {
        win?.close();
        toast.error("This file is no longer available.");
        return;
      }

      if (win) win.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      win?.close();
      console.error("Open error:", error);
      toast.error("Failed to open file");
    }
  };

  const handleDownload = async (upload: MemberDownload) => {
    setDownloading(upload.id);
    setDownloadProgress((prev) => ({ ...prev, [upload.id]: 0 }));

    try {
      const url = await getDownloadUrl(upload.storage_path);
      if (!url) {
        toast.error("This file is no longer available.");
        return;
      }

      await downloadFileFromUrl(url, upload.file_name, (pct) =>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Church className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ChurchFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{member.full_name}</p>
              <p className="text-xs text-muted-foreground">{member.branches?.name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Member Portal</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, {member.full_name.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">{member.churches?.name} • {member.branches?.name}</p>
        </div>

        {/* Quick Check-in Card */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Your QR Code
              </CardTitle>
              <CardDescription>
                Show this to staff for quick check-in
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl mb-4">
                <QRCodeSVG value={member.qr_code_token} size={160} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Staff can scan this code to check you in
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Your Member Code
              </CardTitle>
              <CardDescription>
                Use for self check-in at services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Phone Number</p>
                <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                  {member.phone || "Not set"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter this for self check-in
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary/50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Member ID</p>
                  <p className="font-mono font-semibold">{member.member_code}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gamified Streak Dashboard */}
        <StreakDashboard 
          stats={stats} 
          attendanceDates={attendanceHistory.map(a => a.services?.service_date).filter(Boolean) as string[]}
          services={churchServices}
          attendedServiceIds={new Set(attendanceHistory.map(a => (a as any).service_id).filter(Boolean))}
          memberName={member.full_name}
          churchName={member.churches?.name}
        />

        {/* Recent Services Streak Indicator */}
        <RecentServicesStreak
          services={churchServices}
          attendedServiceIds={new Set(attendanceHistory.map(a => (a as any).service_id).filter(Boolean))}
          currentStreak={stats?.currentStreak || 0}
        />

        {/* Tithe Statistics */}
        <MemberTitheStats memberId={member.id} />

        {/* Service Downloads */}
        {memberDownloads && memberDownloads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Service Downloads
              </CardTitle>
              <CardDescription>
                Download materials from services you attended (available for 48 hours)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {memberDownloads.map((upload) => {
                const timeRemaining = getTimeRemaining(upload.expires_at);
                if (!timeRemaining) return null;

                return (
                  <div key={upload.id} className="space-y-2">
                    {upload.service && (
                      <div className="text-sm text-muted-foreground">
                        {upload.service.name} • {format(new Date(upload.service.service_date), "MMM d, yyyy")}
                      </div>
                    )}
                    <div className="rounded-lg bg-secondary/50">
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
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeRemaining} left
                            </span>
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
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}