import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Church, 
  LogOut, 
  QrCode, 
  Copy,
  Check,
  User,
  Clock,
  MapPin,
  History,
  Calendar,
  Download,
  FileText,
  Music,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { StreakDashboard } from "@/components/member/StreakDashboard";
import { useMemberServiceDownloads, getDownloadUrl, MemberDownload } from "@/hooks/useServiceUploads";

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

const RECORDS_PER_PAGE = 10;

export default function MemberPortal() {
  const [member, setMember] = useState<MemberData | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RECORDS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
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
              const newStats = calculateStreakStats(updated);
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
  }, [member?.id, attendanceHistory]);

  const fetchMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/member/login");
        return;
      }

      // Fetch member data
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, member_code, qr_code_token, phone, email, branches(name), churches(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData) {
        navigate("/member/login");
        return;
      }

      setMember(memberData as MemberData);

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
        const stats = calculateStreakStats(attendanceData);
        setStats(stats);
        setAttendanceHistory(attendanceData as AttendanceRecord[]);
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreakStats = (attendanceData: any[]): AttendanceStats => {
    if (!attendanceData.length) {
      return {
        totalAttendance: 0,
        currentStreak: 0,
        longestStreak: 0,
        thisMonthCount: 0,
        lastAttendance: null
      };
    }

    // Get unique service dates
    const serviceDates = [...new Set(
      attendanceData.map(a => a.services?.service_date).filter(Boolean)
    )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Calculate current streak (consecutive weeks)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    // Check if attended in the last week
    const lastDate = serviceDates[0] ? new Date(serviceDates[0]) : null;
    const attendedRecently = lastDate && lastDate >= oneWeekAgo;

    if (attendedRecently) {
      // Count consecutive weeks
      let previousWeekStart = new Date(today);
      previousWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week

      for (let i = 0; i < serviceDates.length; i++) {
        const date = new Date(serviceDates[i]);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        
        const diffWeeks = Math.floor((previousWeekStart.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        if (diffWeeks <= 1) {
          tempStreak++;
          previousWeekStart = weekStart;
        } else {
          break;
        }
      }
      currentStreak = tempStreak;
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < serviceDates.length; i++) {
      const curr = new Date(serviceDates[i - 1]);
      const prev = new Date(serviceDates[i]);
      const currWeek = Math.floor(curr.getTime() / (7 * 24 * 60 * 60 * 1000));
      const prevWeek = Math.floor(prev.getTime() / (7 * 24 * 60 * 60 * 1000));
      
      if (currWeek - prevWeek <= 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    // This month count
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthCount = serviceDates.filter(d => {
      const date = new Date(d);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;

    return {
      totalAttendance: serviceDates.length,
      currentStreak,
      longestStreak,
      thisMonthCount,
      lastAttendance: serviceDates[0] || null
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

  const handleDownload = async (upload: MemberDownload) => {
    setDownloading(upload.id);
    try {
      const url = await getDownloadUrl(upload.storage_path);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = upload.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
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
                <p className="text-xs text-muted-foreground mb-2">Member Code</p>
                <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                  {member.phone?.slice(-4) || "----"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Last 4 digits of your phone
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary/50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Full Code (for reference)</p>
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
        />

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
                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
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
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Attendance History
            </CardTitle>
            <CardDescription>
              Your recent service attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records yet</p>
                <p className="text-sm">Your check-ins will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.slice(0, visibleCount).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {record.services?.name || "Service"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {record.services?.service_date
                            ? format(new Date(record.services.service_date), "MMM d, yyyy")
                            : "Unknown date"}
                        </span>
                        {record.services?.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {record.services.start_time.slice(0, 5)}
                          </span>
                        )}
                        {record.services?.branches?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {record.services.branches.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right shrink-0">
                      <p>Checked in</p>
                      <p>{format(new Date(record.checked_in_at), "h:mm a")}</p>
                    </div>
                  </div>
                ))}
                
                {/* Load More / Showing count */}
                {attendanceHistory.length > visibleCount ? (
                  <div className="pt-4 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsLoadingMore(true);
                        setTimeout(() => {
                          setVisibleCount(prev => prev + RECORDS_PER_PAGE);
                          setIsLoadingMore(false);
                        }, 300);
                      }}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        `Load More (${attendanceHistory.length - visibleCount} remaining)`
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Showing {visibleCount} of {attendanceHistory.length} records
                    </p>
                  </div>
                ) : attendanceHistory.length > RECORDS_PER_PAGE ? (
                  <p className="text-center text-sm text-muted-foreground pt-4">
                    Showing all {attendanceHistory.length} records
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}