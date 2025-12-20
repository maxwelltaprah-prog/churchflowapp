import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Church, 
  LogOut, 
  QrCode, 
  Flame, 
  Calendar, 
  TrendingUp,
  Award,
  Copy,
  Check,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

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

export default function MemberPortal() {
  const [member, setMember] = useState<MemberData | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMemberData();
  }, []);

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

      // Fetch attendance stats
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("checked_in_at, services(service_date)")
        .eq("member_id", memberData.id)
        .order("checked_in_at", { ascending: false });

      if (attendanceData) {
        const stats = calculateStreakStats(attendanceData);
        setStats(stats);
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

        {/* Streak Card - Main Feature */}
        <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
                  <Flame className="w-10 h-10 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Current Streak</p>
                  <p className="text-5xl font-bold text-primary">{stats?.currentStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">weeks</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-12 h-12 mx-auto rounded-xl bg-secondary flex items-center justify-center mb-2">
                    <Award className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-2xl font-bold">{stats?.longestStreak || 0}</p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
                <div>
                  <div className="w-12 h-12 mx-auto rounded-xl bg-secondary flex items-center justify-center mb-2">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stats?.thisMonthCount || 0}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
                <div>
                  <div className="w-12 h-12 mx-auto rounded-xl bg-secondary flex items-center justify-center mb-2">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{stats?.totalAttendance || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
            
            {stats?.lastAttendance && (
              <p className="text-center text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">
                Last attended: {new Date(stats.lastAttendance).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* QR Code and Member Code */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                Your QR Code
              </CardTitle>
              <CardDescription>
                Show this at check-in for quick registration
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <QRCodeSVG
                  value={member.qr_code_token}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Member Code</CardTitle>
              <CardDescription>
                Use this code for manual check-in
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-full">
              <div className="bg-secondary/50 rounded-2xl p-8 text-center w-full max-w-xs">
                <p className="text-4xl font-mono font-bold text-primary tracking-wider mb-4">
                  {member.member_code}
                </p>
                <Button
                  variant="outline"
                  onClick={handleCopyCode}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Encouragement based on streak */}
        {stats && (
          <Card className="bg-secondary/30 border-none">
            <CardContent className="py-6 text-center">
              {stats.currentStreak === 0 ? (
                <p className="text-muted-foreground">
                  🙏 We haven't seen you in a while. Join us this week to start your streak!
                </p>
              ) : stats.currentStreak >= 4 ? (
                <p className="text-muted-foreground">
                  🔥 Amazing! You're on a {stats.currentStreak}-week streak. Keep the momentum going!
                </p>
              ) : stats.currentStreak >= 2 ? (
                <p className="text-muted-foreground">
                  ⭐ Great job! {stats.currentStreak} weeks in a row. You're building a great habit!
                </p>
              ) : (
                <p className="text-muted-foreground">
                  👋 Welcome back! Keep attending to build your streak.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}