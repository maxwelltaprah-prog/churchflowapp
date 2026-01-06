import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  UsersRound,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  ChevronRight,
  Activity,
  RefreshCw,
} from "lucide-react";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import { useActiveGroups } from "@/hooks/useGroupsData";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useServiceDrivenAttendanceTrend } from "@/hooks/useServiceDrivenTimeline";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(280 65% 60%)"];

// =================== Attendance KPI Hook ===================
function useAttendanceKPIs() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["attendance-kpis", profile?.church_id, filters.branchId, filters.serviceIds, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Fetch all attendance in date range
      let attendanceQuery = supabase
        .from("attendance")
        .select("id, member_id, checked_in_at, branch_id, service_id, members!inner(id, membership_status)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      // Apply service filter if specific services are selected
      if (filters.serviceIds.length > 0) {
        attendanceQuery = attendanceQuery.in("service_id", filters.serviceIds);
      }

      const { data: attendanceData } = await attendanceQuery;
      const attendance = attendanceData || [];

      // Total check-ins
      const totalCheckins = attendance.length;

      // Unique attendees
      const uniqueAttendeeIds = new Set(attendance.map(a => a.member_id));
      const uniqueAttendees = uniqueAttendeeIds.size;

      // Active vs Inactive/Transferred breakdown
      const memberCheckins = attendance.filter(a => 
        (a.members as any)?.membership_status === "active"
      ).length;
      const visitorCheckins = attendance.filter(a => 
        (a.members as any)?.membership_status === "inactive" || 
        (a.members as any)?.membership_status === "transferred"
      ).length;

      // Get total NEW visitors count for the filtered period (registered in date range)
      let newVisitorsQuery = supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      // Apply branch filter for visitors
      if (filters.branchId) {
        newVisitorsQuery = newVisitorsQuery.eq("branch_id", filters.branchId);
      } else if (accessibleBranchIds && accessibleBranchIds.length > 0) {
        newVisitorsQuery = newVisitorsQuery.in("branch_id", accessibleBranchIds);
      }

      let totalNewVisitors = 0;
      let totalReturningVisitors = 0;

      if (filters.serviceIds.length > 0) {
        // Get visitors registered on service dates for selected services
        const { data: servicesForDates } = await supabase
          .from("services")
          .select("service_date")
          .in("id", filters.serviceIds);
        
        const serviceDates = servicesForDates?.map(s => s.service_date) || [];
        
        if (serviceDates.length > 0) {
          const { count: newCount } = await supabase
            .from("visitors")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .in("first_visit_date", serviceDates);
          totalNewVisitors = newCount || 0;
        }

        // Get returning visitors (checked in for selected services, have 2+ total check-ins)
        const { data: visitorCheckinsData } = await supabase
          .from("visitor_checkins")
          .select("visitor_id")
          .eq("church_id", profile.church_id)
          .in("service_id", filters.serviceIds);
        
        const checkedInVisitorIds = [...new Set(visitorCheckinsData?.map(vc => vc.visitor_id) || [])];
        
        if (checkedInVisitorIds.length > 0) {
          // Count total check-ins per visitor
          const { data: allCheckins } = await supabase
            .from("visitor_checkins")
            .select("visitor_id")
            .eq("church_id", profile.church_id)
            .in("visitor_id", checkedInVisitorIds);
          
          const checkinCounts = new Map<string, number>();
          (allCheckins || []).forEach(vc => {
            checkinCounts.set(vc.visitor_id, (checkinCounts.get(vc.visitor_id) || 0) + 1);
          });
          
          // Returning = 2+ total check-ins
          totalReturningVisitors = checkedInVisitorIds.filter(id => (checkinCounts.get(id) || 0) >= 2).length;
        }
      } else {
        // No service filter - count visitors registered in date range
        newVisitorsQuery = newVisitorsQuery
          .gte("first_visit_date", filters.startDate.toISOString().split("T")[0])
          .lte("first_visit_date", filters.endDate.toISOString().split("T")[0]);
        
        const { count } = await newVisitorsQuery;
        totalNewVisitors = count || 0;

        // Get returning visitors who checked in during the period
        const { data: periodCheckins } = await supabase
          .from("visitor_checkins")
          .select("visitor_id, checked_in_at")
          .eq("church_id", profile.church_id)
          .gte("checked_in_at", filters.startDate.toISOString())
          .lte("checked_in_at", filters.endDate.toISOString());

        const checkedInVisitorIds = [...new Set(periodCheckins?.map(vc => vc.visitor_id) || [])];
        
        if (checkedInVisitorIds.length > 0) {
          const { data: allCheckins } = await supabase
            .from("visitor_checkins")
            .select("visitor_id")
            .eq("church_id", profile.church_id)
            .in("visitor_id", checkedInVisitorIds);
          
          const checkinCounts = new Map<string, number>();
          (allCheckins || []).forEach(vc => {
            checkinCounts.set(vc.visitor_id, (checkinCounts.get(vc.visitor_id) || 0) + 1);
          });
          
          totalReturningVisitors = checkedInVisitorIds.filter(id => (checkinCounts.get(id) || 0) >= 2).length;
        }
      }

      // Absentees: members who didn't attend ANY service within the filter period
      // Get all services in the filter period
      let servicesQuery = supabase
        .from("services")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", filters.startDate.toISOString().split("T")[0])
        .lte("service_date", filters.endDate.toISOString().split("T")[0]);

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      // Apply service filter if specific services are selected
      if (filters.serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", filters.serviceIds);
      }

      const { data: servicesData } = await servicesQuery;
      const serviceIdsInPeriod = (servicesData || []).map(s => s.id);

      if (serviceIdsInPeriod.length === 0) {
        // No services in period
        return {
          totalCheckins,
          uniqueAttendees,
          memberCheckins,
          visitorCheckins,
          totalNewVisitors,
          totalReturningVisitors,
          absentees: 0,
          totalMembers: 0,
        };
      }

      // Get all active members
      let membersQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .eq("membership_status", "active");

      membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      
      const { data: allMembers } = await membersQuery;
      const memberIds = (allMembers || []).map(m => m.id);

      // Get attendance for services in the period
      let periodAttendanceQuery = supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIdsInPeriod);

      periodAttendanceQuery = applyBranchFilter(periodAttendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: periodAttendance } = await periodAttendanceQuery;
      
      // Get unique member IDs who attended at least one service
      const attendedMemberIds = new Set((periodAttendance || []).map(a => a.member_id));

      // Absentees = members who didn't attend any service in the period
      const absentees = memberIds.filter(id => !attendedMemberIds.has(id)).length;

      return {
        totalCheckins,
        uniqueAttendees,
        memberCheckins,
        visitorCheckins,
        totalNewVisitors,
        totalReturningVisitors,
        absentees,
        totalMembers: memberIds.length,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Attendance Trend Hook (Service-Driven) ===================
function useAttendanceTrendData() {
  const { filters } = useAnalyticsFilters();
  
  return useServiceDrivenAttendanceTrend(
    filters.startDate,
    filters.endDate,
    filters.branchId || undefined,
    filters.serviceIds
  );
}

// =================== Branch Comparison Hook ===================
function useBranchComparisonData() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds, isChurchAdmin } = useBranchAccess();
  const { data: branches } = useBranches();

  return useQuery({
    queryKey: ["branch-comparison-detailed", profile?.church_id, filters.serviceIds, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds, branches],
    queryFn: async () => {
      if (!profile?.church_id || !branches?.length) return [];

      // Filter branches by access
      const accessibleBranches = branches.filter(b => {
        if (isChurchAdmin || accessibleBranchIds === null) return true;
        return accessibleBranchIds.includes(b.id);
      });

      const branchStats = await Promise.all(
        accessibleBranches.map(async (branch) => {
          let attendanceQuery = supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .gte("checked_in_at", filters.startDate.toISOString())
            .lte("checked_in_at", filters.endDate.toISOString());

          // Apply service filter if specific services are selected
          if (filters.serviceIds.length > 0) {
            attendanceQuery = attendanceQuery.in("service_id", filters.serviceIds);
          }

          const { count: attendanceCount } = await attendanceQuery;

          const { count: memberCount } = await supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .eq("is_active", true)
            .eq("approval_status", "approved");

          return {
            id: branch.id,
            name: branch.name.replace(" Branch", ""),
            attendance: attendanceCount || 0,
            members: memberCount || 0,
            rate: memberCount && memberCount > 0 
              ? Math.round(((attendanceCount || 0) / memberCount) * 100) 
              : 0,
          };
        })
      );

      return branchStats.sort((a, b) => b.attendance - a.attendance);
    },
    enabled: !!profile?.church_id && !!branches?.length,
  });
}

// =================== Services Summary Hook ===================
function useServicesSummary() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["services-summary", profile?.church_id, filters.branchId, filters.serviceIds, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("services")
        .select(`
          id,
          name,
          service_date,
          start_time,
          branch_id,
          branches(name),
          attendance(count)
        `)
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"))
        .order("service_date", { ascending: false });

      query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      // Apply service filter if specific services are selected
      if (filters.serviceIds.length > 0) {
        query = query.in("id", filters.serviceIds);
      }

      const { data: services } = await query;

      return (services || []).map(s => ({
        id: s.id,
        name: s.name,
        date: format(parseISO(s.service_date), "MMM d, yyyy"),
        time: s.start_time ? format(parseISO(`2000-01-01T${s.start_time}`), "h:mm a") : "—",
        branch: (s.branches as any)?.name || "Unknown",
        attendance: (s.attendance as any)?.[0]?.count || 0,
      }));
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Group Attendance Trend Hook ===================
function useGroupAttendanceTrend(groupId: string | null) {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["group-attendance-trend", profile?.church_id, groupId, filters.startDate.toISOString(), filters.endDate.toISOString(), filters.branchId, filters.serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id || !groupId) return [];

      // Get services in the filter period
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"))
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      if (filters.serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", filters.serviceIds);
      }

      const { data: services } = await servicesQuery;
      if (!services?.length) return [];

      // Get members in this group
      const { data: groupMembers } = await supabase
        .from("member_groups")
        .select("member_id")
        .eq("group_id", groupId);

      const memberIds = (groupMembers || []).map(gm => gm.member_id);
      if (memberIds.length === 0) return [];

      // Get attendance for these members in the services
      const serviceIds = services.map(s => s.id);
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id, member_id")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds)
        .in("member_id", memberIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Group attendance by service
      const attendanceByService = new Map<string, Set<string>>();
      (attendance || []).forEach(a => {
        if (!attendanceByService.has(a.service_id)) {
          attendanceByService.set(a.service_id, new Set());
        }
        attendanceByService.get(a.service_id)!.add(a.member_id);
      });

      // Build trend data
      return services.map(service => ({
        date: format(parseISO(service.service_date), "MMM d"),
        fullDate: format(parseISO(service.service_date), "MMM d, yyyy"),
        serviceName: service.name,
        attendance: attendanceByService.get(service.id)?.size || 0,
        totalMembers: memberIds.length,
      }));
    },
    enabled: !!profile?.church_id && !!groupId,
  });
}

// =================== KPI Card Component ===================
interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  href?: string;
  isLoading?: boolean;
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "destructive";
}

function KPICard({ title, value, icon: Icon, description, href, isLoading, variant = "default" }: KPICardProps) {
  const variantStyles = {
    default: { bg: "bg-muted/50", iconBg: "bg-muted", iconColor: "text-muted-foreground" },
    primary: { bg: "bg-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary" },
    accent: { bg: "bg-accent/5", iconBg: "bg-accent/10", iconColor: "text-accent" },
    success: { bg: "bg-green-500/5", iconBg: "bg-green-500/10", iconColor: "text-green-600" },
    warning: { bg: "bg-amber-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
    destructive: { bg: "bg-destructive/5", iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  };

  const styles = variantStyles[variant];

  const content = (
    <Card className={`relative overflow-hidden transition-all ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
          </div>
        )}
        {href && !isLoading && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center text-xs text-primary font-medium">
            View details <ChevronRight className="w-3 h-3 ml-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

// =================== Main Component ===================
export default function AttendanceOverviewPage() {
  const { filters } = useAnalyticsFilters();
  const { data: kpis, isLoading: kpisLoading } = useAttendanceKPIs();
  const { data: trendResult, isLoading: trendLoading } = useAttendanceTrendData();
  const { data: branchData, isLoading: branchLoading } = useBranchComparisonData();
  const { data: services, isLoading: servicesLoading } = useServicesSummary();
  const { data: branches } = useBranches();
  const { data: groups } = useActiveGroups();
  
  // Group attendance state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Set default group when groups load
  useMemo(() => {
    if (groups?.length && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);
  
  const { data: groupTrendData, isLoading: groupTrendLoading } = useGroupAttendanceTrend(selectedGroupId);

  const trendData = trendResult?.data || [];
  const hasTrendData = trendResult?.hasData || false;
  
  const periodLabel = formatDateRangeLabel(filters);
  const showBranchChart = (branches?.length || 0) > 1;

  // Breakdown data for pie chart
  const breakdownData = useMemo(() => {
    if (!kpis) return [];
    return [
      { name: "Members", value: kpis.memberCheckins, color: "hsl(var(--primary))" },
      { name: "Visitors", value: kpis.visitorCheckins, color: "hsl(var(--accent))" },
    ].filter(d => d.value > 0);
  }, [kpis]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Attendance Overview</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Overview</h1>
        <p className="text-muted-foreground">
          Comprehensive attendance metrics and trends
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard
          title="Total Check-ins"
          value={kpis?.totalCheckins || 0}
          icon={UserCheck}
          description={periodLabel}
          isLoading={kpisLoading}
          variant="primary"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=all`}
        />
        <KPICard
          title="Unique Attendees"
          value={kpis?.uniqueAttendees || 0}
          icon={Users}
          description="Distinct people"
          isLoading={kpisLoading}
          variant="accent"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=all`}
        />
        <KPICard
          title="Member Check-ins"
          value={kpis?.memberCheckins || 0}
          icon={UsersRound}
          isLoading={kpisLoading}
          variant="success"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=members`}
        />
        <KPICard
          title="New Visitors"
          value={kpis?.totalNewVisitors || 0}
          icon={UserPlus}
          description="Registered in period"
          isLoading={kpisLoading}
          variant="warning"
          href="/app/visitors"
        />
        <KPICard
          title="Returning Visitors"
          value={kpis?.totalReturningVisitors || 0}
          icon={RefreshCw}
          description="2+ check-ins"
          isLoading={kpisLoading}
          variant="accent"
          href="/app/visitors?segment=returning"
        />
        <KPICard
          title="Absentees"
          value={kpis?.absentees || 0}
          icon={UserMinus}
          description="No attendance in period"
          isLoading={kpisLoading}
          variant="destructive"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=absentees`}
        />
      </div>

      {/* Attendance Trend Charts - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Total Check-ins Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Total Check-ins Trend
            </CardTitle>
            <CardDescription className="text-xs">
              All check-ins per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData && trendData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Line
                    type="linear"
                    dataKey="total"
                    name="Total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Check-ins Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UsersRound className="w-4 h-4 text-green-600" />
              Member Check-ins Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Active member attendance per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData && trendData.some(d => d.members > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Line
                    type="linear"
                    dataKey="members"
                    name="Members"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142 76% 36%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visitors Trend (New vs Returning) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-600" />
              Visitors Trend
            </CardTitle>
            <CardDescription className="text-xs">
              New vs returning visitors per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Legend />
                  <Line
                    type="linear"
                    dataKey="newVisitors"
                    name="New Visitors"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(38 92% 50%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="linear"
                    dataKey="returningVisitors"
                    name="Returning Visitors"
                    stroke="hsl(280 65% 60%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(280 65% 60%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absentees Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-red-600" />
              Absentees Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Members absent per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Line
                    type="linear"
                    dataKey="absentees"
                    name="Absentees"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Attendance Card - Full Width */}
      {groups && groups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-primary" />
                  Group Attendance Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Attendance of group members per service
                </CardDescription>
              </div>
              <Select
                value={selectedGroupId || ""}
                onValueChange={(value) => setSelectedGroupId(value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {groupTrendLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : groupTrendData && groupTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={groupTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                    formatter={(value: number, name: string, props: any) => {
                      const total = props.payload?.totalMembers || 0;
                      return [`${value} / ${total} members`, "Attendance"];
                    }}
                  />
                  <Line
                    type="linear"
                    dataKey="attendance"
                    name="Attendance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                <UsersRound className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No attendance data for this group</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Branch Comparison Section */}
      <div className={`grid gap-6 ${showBranchChart ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        {showBranchChart ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                Branch Comparison
              </CardTitle>
              <CardDescription>Attendance by branch</CardDescription>
            </CardHeader>
            <CardContent>
              {branchLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : branchData && branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={branchData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [value, name === "attendance" ? "Check-ins" : name]}
                    />
                    <Bar dataKey="attendance" name="Check-ins" radius={[0, 4, 4, 0]}>
                      {branchData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mb-3 opacity-20" />
                  <p>No branch data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersRound className="w-5 h-5 text-accent" />
                Attendance Breakdown
              </CardTitle>
              <CardDescription>Members vs Visitors</CardDescription>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : breakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {breakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                  <UsersRound className="w-12 h-12 mb-3 opacity-20" />
                  <p>No attendance data</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Services Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Services Summary
            </CardTitle>
            <CardDescription>
              Services held during {periodLabel.toLowerCase()}
            </CardDescription>
          </div>
          <Link to="/app/services">
            <Button variant="outline" size="sm">
              View All Services <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {servicesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : services && services.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.slice(0, 10).map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.date}</TableCell>
                      <TableCell className="text-muted-foreground">{service.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {service.branch}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-primary">{service.attendance}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/app/analytics/attendance/service/${service.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No services found for this period</p>
              <p className="text-sm">Create services to start tracking attendance</p>
            </div>
          )}
          {services && services.length > 10 && (
            <div className="mt-4 text-center">
              <Link to="/app/services">
                <Button variant="link" size="sm">
                  View all {services.length} services <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
