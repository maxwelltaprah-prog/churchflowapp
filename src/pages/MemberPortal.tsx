import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Church, 
  LogOut, 
  User, 
  Flame,
  QrCode,
  Wallet,
  Download,
  Sparkles,
  ChevronRight,
  Trophy,
  Calendar,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemberServiceDownloads } from "@/hooks/useServiceUploads";
import { useMemberEngagementSettings } from "@/hooks/useEngagementSettings";
import { MemberCheckinSection } from "@/components/member/MemberCheckinSection";
import { MemberStreakSection } from "@/components/member/MemberStreakSection";
import { MemberTithesSection } from "@/components/member/MemberTithesSection";
import { MemberDownloadsSection } from "@/components/member/MemberDownloadsSection";
import { MemberProfileSection } from "@/components/member/MemberProfileSection";
import { MemberEngagementSectionWrapper } from "@/components/member/MemberEngagementSectionWrapper";
import { format } from "date-fns";

type MenuSection = 
  | "home" 
  | "checkin" 
  | "tithes" 
  | "downloads" 
  | "engagement" 
  | "streak"
  | "profile";

interface MemberData {
  id: string;
  full_name: string;
  member_code: string;
  qr_code_token: string;
  phone: string | null;
  email: string | null;
  church_id: string;
  branch_id: string;
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

// Feed Action Card Component
interface FeedActionProps {
  icon: typeof QrCode;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
  badge?: string;
}

function FeedActionCard({ icon: Icon, title, description, iconBg, iconColor, onClick, badge }: FeedActionProps) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            {badge && (
              <Badge variant="secondary" className="text-xs">{badge}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

export default function MemberPortal() {
  const [member, setMember] = useState<MemberData | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [churchServices, setChurchServices] = useState<ChurchService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<MenuSection>("home");
  const navigate = useNavigate();
  
  const { data: memberDownloads } = useMemberServiceDownloads(member?.id);
  const { data: engagementSettings } = useMemberEngagementSettings(member?.id);

  const hasEngagement = Boolean(
    engagementSettings?.enableTodayAtChurch ||
    engagementSettings?.enablePrayerWall ||
    engagementSettings?.enablePersonalizedFeed ||
    engagementSettings?.enableSermonFollowups
  );

  const hasDownloads = Boolean(memberDownloads && memberDownloads.length > 0);

  useEffect(() => {
    fetchMemberData();
  }, []);

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

      const { data: allServices } = await supabase
        .from("services")
        .select("id, name, service_date, branch_id, branches(name)")
        .eq("church_id", memberData.church_id)
        .eq("branch_id", memberData.branch_id)
        .eq("is_active", true)
        .lte("service_date", new Date().toISOString().split('T')[0])
        .order("service_date", { ascending: false })
        .limit(20);

      const services = allServices || [];
      setChurchServices(services);

      const { data: attendanceData } = await supabase
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
    const attendedServiceIds = new Set(
      attendanceData.map(a => a.service_id).filter(Boolean)
    );

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

    const sortedServices = [...allServices].sort(
      (a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
    );

    let currentStreak = 0;
    for (const service of sortedServices) {
      if (attendedServiceIds.has(service.id)) {
        currentStreak++;
      } else {
        break;
      }
    }

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

  const renderSection = () => {
    switch (activeSection) {
      case "checkin":
        return <MemberCheckinSection member={member} onBack={() => setActiveSection("home")} />;
      case "streak":
        return (
          <MemberStreakSection
            stats={stats}
            attendanceHistory={attendanceHistory}
            churchServices={churchServices}
            memberName={member.full_name}
            churchName={member.churches?.name}
            onBack={() => setActiveSection("home")}
          />
        );
      case "tithes":
        return <MemberTithesSection memberId={member.id} onBack={() => setActiveSection("home")} />;
      case "downloads":
        return <MemberDownloadsSection downloads={memberDownloads || []} onBack={() => setActiveSection("home")} />;
      case "engagement":
        return (
          <MemberEngagementSectionWrapper
            memberId={member.id}
            churchId={member.church_id}
            branchId={member.branch_id}
            memberName={member.full_name}
            onBack={() => setActiveSection("home")}
          />
        );
      case "profile":
        return <MemberProfileSection member={member} onBack={() => setActiveSection("home")} />;
      default:
        return (
          <div className="space-y-6">
            {/* Hero Streak Card */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Your Streak</p>
                    <div className="flex items-center gap-3">
                      <Flame className="w-10 h-10" />
                      <div>
                        <span className="text-5xl font-bold">{stats?.currentStreak || 0}</span>
                        <span className="text-lg ml-2 opacity-90">services</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                      <Trophy className="w-4 h-4 opacity-80" />
                      <span className="text-sm opacity-90">Best: {stats?.longestStreak || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="w-4 h-4 opacity-80" />
                      <span className="text-sm opacity-90">This month: {stats?.thisMonthCount || 0}</span>
                    </div>
                  </div>
                </div>
                {stats?.lastAttendance && (
                  <p className="text-xs mt-4 opacity-75">
                    Last attended: {format(new Date(stats.lastAttendance), "EEEE, MMM d, yyyy")}
                  </p>
                )}
              </div>
              <CardContent className="p-4 bg-card">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between"
                  onClick={() => setActiveSection("streak")}
                >
                  <span>View full streak details</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Feed Actions */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground px-1">Quick Actions</h2>
              
              <FeedActionCard
                icon={QrCode}
                title="Check In"
                description="Show your QR code or member ID"
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-500"
                onClick={() => setActiveSection("checkin")}
              />

              <FeedActionCard
                icon={Wallet}
                title="My Giving"
                description="View your tithe and offering history"
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                onClick={() => setActiveSection("tithes")}
              />

              {hasEngagement && (
                <FeedActionCard
                  icon={Sparkles}
                  title="Engagement"
                  description="Prayer wall, daily content & more"
                  iconBg="bg-violet-500/10"
                  iconColor="text-violet-500"
                  onClick={() => setActiveSection("engagement")}
                />
              )}

              {hasDownloads && (
                <FeedActionCard
                  icon={Download}
                  title="Downloads"
                  description="Service materials available"
                  iconBg="bg-blue-500/10"
                  iconColor="text-blue-500"
                  onClick={() => setActiveSection("downloads")}
                  badge={`${memberDownloads?.length || 0} files`}
                />
              )}

              <FeedActionCard
                icon={User}
                title="My Profile"
                description="View your member information"
                iconBg="bg-slate-500/10"
                iconColor="text-slate-500"
                onClick={() => setActiveSection("profile")}
              />
            </div>

            {/* Recent Activity */}
            {attendanceHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Your latest check-ins</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {attendanceHistory.slice(0, 5).map((record) => (
                        <div 
                          key={record.id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                        >
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Church className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {record.services?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.services?.service_date && 
                                format(new Date(record.services.service_date), "EEEE, MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            ✓ Attended
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

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

      <main className="container py-6 max-w-2xl mx-auto">
        {/* Welcome Section - Only on home */}
        {activeSection === "home" && (
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent mb-3">
              <User className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Member Portal</span>
            </div>
            <h1 className="text-2xl font-bold">
              Welcome back, {member.full_name.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {member.churches?.name} • {member.branches?.name}
            </p>
          </div>
        )}

        {renderSection()}
      </main>
    </div>
  );
}
