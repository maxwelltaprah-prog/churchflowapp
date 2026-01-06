import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  UserPlus,
  UserCheck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw,
  UserMinus,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { 
  format, 
  subMonths,
  parseISO,
  isWithinInterval,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
} from "date-fns";
import { useServiceDrivenMemberGrowth } from "@/hooks/useServiceDrivenTimeline";

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  success: "hsl(142 76% 36%)",
  warning: "hsl(38 92% 50%)",
  muted: "hsl(var(--muted-foreground))",
  purple: "hsl(280 65% 60%)",
  blue: "hsl(200 80% 50%)",
};

const TREND_SERIES = [
  { key: "totalMembers", label: "Total Members", color: CHART_COLORS.primary },
  { key: "activeMembers", label: "Active Members", color: CHART_COLORS.success },
  { key: "inactiveMembers", label: "Inactive Members", color: CHART_COLORS.muted },
  { key: "transferredMembers", label: "Transferred Members", color: CHART_COLORS.warning },
  { key: "visitors", label: "Visitors", color: CHART_COLORS.purple },
] as const;

// =================== Member Growth KPIs Hook ===================
function useMemberGrowthKPIs() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["member-growth-kpis", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Fetch all members
      let membersQuery = supabase
        .from("members")
        .select("id, created_at, membership_status, approval_status, is_active")
        .eq("church_id", profile.church_id);

      membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: allMembers } = await membersQuery;
      const members = allMembers || [];

      // New members in date range
      const newMembers = members.filter(m => {
        const createdAt = new Date(m.created_at);
        return createdAt >= filters.startDate && createdAt <= filters.endDate;
      });

      // Calculate previous period for comparison
      const periodDays = differenceInDays(filters.endDate, filters.startDate) + 1;
      const prevStart = new Date(filters.startDate);
      prevStart.setDate(prevStart.getDate() - periodDays);
      const prevEnd = new Date(filters.startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const prevNewMembers = members.filter(m => {
        const createdAt = new Date(m.created_at);
        return createdAt >= prevStart && createdAt <= prevEnd;
      });

      // Growth rate
      const growthRate = prevNewMembers.length > 0 
        ? ((newMembers.length - prevNewMembers.length) / prevNewMembers.length) * 100 
        : newMembers.length > 0 ? 100 : 0;

      // Status breakdown of new members
      const newMembersByStatus = {
        active: newMembers.filter(m => m.membership_status === "active").length,
        inactive: newMembers.filter(m => m.membership_status === "inactive").length,
        transferred: newMembers.filter(m => m.membership_status === "transferred").length,
      };

      // Total active members
      const totalActive = members.filter(m => m.is_active && m.approval_status === "approved").length;

      // Visitor Conversion: count visitors converted to members in the date range
      let visitorsQuery = supabase
        .from("visitors")
        .select("id, status, created_at, updated_at")
        .eq("church_id", profile.church_id);

      visitorsQuery = applyBranchFilter(visitorsQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: allVisitors } = await visitorsQuery;
      const visitors = allVisitors || [];

      // Visitors registered in the date range
      const visitorsInPeriod = visitors.filter(v => {
        const createdAt = new Date(v.created_at);
        return createdAt >= filters.startDate && createdAt <= filters.endDate;
      });

      // Converted visitors (status = 'converted') from the period
      const convertedVisitors = visitorsInPeriod.filter(v => v.status === "converted");
      
      // Conversion rate: converted visitors / total visitors registered in period
      const totalVisitorsInPeriod = visitorsInPeriod.length;
      const conversionRate = totalVisitorsInPeriod > 0 
        ? (convertedVisitors.length / totalVisitorsInPeriod) * 100 
        : 0;

      return {
        newMembers: newMembers.length,
        prevNewMembers: prevNewMembers.length,
        growthRate: Math.round(growthRate),
        totalActive,
        newMembersByStatus,
        conversionRate: Math.round(conversionRate),
        convertedCount: convertedVisitors.length,
        totalVisitorsInPeriod,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Acquisition Trend Hook (Service-Driven) ===================
function useAcquisitionTrend() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["acquisition-trend", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { data: [], hasData: false };

      // Fetch services in the date range
      let servicesQuery = supabase
        .from("services")
        .select("id, name, service_date, start_time, branch_id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"))
        .order("service_date", { ascending: true })
        .order("start_time", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: services } = await servicesQuery;

      if (!services?.length) {
        return { data: [], hasData: false };
      }

      // Get all service dates
      const serviceDates = services.map(s => s.service_date);

      // Fetch new members whose date_joined matches any service date
      let membersQuery = supabase
        .from("members")
        .select("id, date_joined")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .in("date_joined", serviceDates);

      membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: members } = await membersQuery;

      // Fetch converted visitors - match by updated_at date to service dates
      let visitorsQuery = supabase
        .from("visitors")
        .select("id, status, updated_at")
        .eq("church_id", profile.church_id)
        .eq("status", "converted");

      visitorsQuery = applyBranchFilter(visitorsQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: convertedVisitors } = await visitorsQuery;

      // Group members by date_joined
      const membersByDate = new Map<string, number>();
      (members || []).forEach(m => {
        if (m.date_joined) {
          membersByDate.set(m.date_joined, (membersByDate.get(m.date_joined) || 0) + 1);
        }
      });

      // Group conversions by date (extracted from updated_at)
      const conversionsByDate = new Map<string, number>();
      (convertedVisitors || []).forEach(v => {
        const convertedDate = format(new Date(v.updated_at), "yyyy-MM-dd");
        // Only count if the conversion date matches a service date
        if (serviceDates.includes(convertedDate)) {
          conversionsByDate.set(convertedDate, (conversionsByDate.get(convertedDate) || 0) + 1);
        }
      });

      // Build trend data per service
      const trendData = services.map(service => {
        const newMembers = membersByDate.get(service.service_date) || 0;
        const conversions = conversionsByDate.get(service.service_date) || 0;
        
        const serviceLabel = service.start_time 
          ? `${service.name} @ ${format(parseISO(`2000-01-01T${service.start_time}`), "h:mm a")}`
          : service.name;

        return {
          date: format(parseISO(service.service_date), "MMM d"),
          fullDate: `${serviceLabel} - ${format(parseISO(service.service_date), "MMM d, yyyy")}`,
          serviceName: service.name,
          members: newMembers,
          conversions: conversions,
          total: newMembers + conversions,
        };
      });

      return { 
        data: trendData, 
        hasData: trendData.length > 0,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Visitor Retention Metrics Hook ===================
function useRetentionMetrics() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["visitor-retention-metrics", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Get visitors registered in the selected period
      let visitorsQuery = supabase
        .from("visitors")
        .select("id, first_visit_date")
        .eq("church_id", profile.church_id)
        .gte("first_visit_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("first_visit_date", format(filters.endDate, "yyyy-MM-dd"));

      visitorsQuery = applyBranchFilter(visitorsQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: visitors } = await visitorsQuery;
      const visitorIds = (visitors || []).map(v => v.id);

      if (visitorIds.length === 0) {
        return {
          totalVisitors: 0,
          returnedOnce: 0,
          returnedMultiple: 0,
          returnRate: 0,
          engagementRate: 0,
        };
      }

      // Get check-ins for these visitors
      let checkinsQuery = supabase
        .from("visitor_checkins")
        .select("visitor_id")
        .eq("church_id", profile.church_id)
        .in("visitor_id", visitorIds);

      const { data: checkins } = await checkinsQuery;

      // Count check-ins per visitor
      const checkinCounts: Record<string, number> = {};
      (checkins || []).forEach(c => {
        checkinCounts[c.visitor_id] = (checkinCounts[c.visitor_id] || 0) + 1;
      });

      // Returned at least once (1+ check-ins after first visit)
      const returnedOnce = Object.values(checkinCounts).filter(c => c >= 2).length;
      // Returned multiple times (3+ check-ins = first visit + 2 returns)
      const returnedMultiple = Object.values(checkinCounts).filter(c => c >= 3).length;

      return {
        totalVisitors: visitorIds.length,
        returnedOnce,
        returnedMultiple,
        returnRate: Math.round((returnedOnce / visitorIds.length) * 100),
        engagementRate: Math.round((returnedMultiple / visitorIds.length) * 100),
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Monthly Comparison Hook ===================
function useMonthlyComparison() {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();
  const { filters } = useAnalyticsFilters();

  return useQuery({
    queryKey: ["monthly-comparison", profile?.church_id, filters.branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get last 6 months of data
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(monthStart);
        months.push({ start: monthStart, end: monthEnd, label: format(monthStart, "MMM") });
      }

      const results = await Promise.all(
        months.map(async ({ start, end, label }) => {
          let query = supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

          query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

          const { count } = await query;

          return {
            month: label,
            newMembers: count || 0,
          };
        })
      );

      return results;
    },
    enabled: !!profile?.church_id,
  });
}

// =================== 6-Month Cumulative Trend Hook ===================
function useSixMonthTrend() {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();
  const { filters } = useAnalyticsFilters();

  return useQuery({
    queryKey: ["six-month-trend", profile?.church_id, filters.branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        months.push({ 
          end: monthEnd, 
          label: format(monthEnd, "MMM yyyy"),
          shortLabel: format(monthEnd, "MMM")
        });
      }

      const results = await Promise.all(
        months.map(async ({ end, label, shortLabel }) => {
          // Cumulative counts up to the end of each month
          let totalQuery = supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .eq("is_active", true)
            .lte("date_joined", format(end, "yyyy-MM-dd"));
          totalQuery = applyBranchFilter(totalQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

          let activeQuery = supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .eq("is_active", true)
            .eq("membership_status", "active")
            .lte("date_joined", format(end, "yyyy-MM-dd"));
          activeQuery = applyBranchFilter(activeQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

          let inactiveQuery = supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .eq("is_active", true)
            .eq("membership_status", "inactive")
            .lte("date_joined", format(end, "yyyy-MM-dd"));
          inactiveQuery = applyBranchFilter(inactiveQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

          let transferredQuery = supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .eq("is_active", true)
            .eq("membership_status", "transferred")
            .lte("date_joined", format(end, "yyyy-MM-dd"));
          transferredQuery = applyBranchFilter(transferredQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

          let visitorsQuery = supabase
            .from("visitors")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .lte("first_visit_date", format(end, "yyyy-MM-dd"));
          visitorsQuery = applyBranchFilter(visitorsQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

          const [total, active, inactive, transferred, visitors] = await Promise.all([
            totalQuery,
            activeQuery,
            inactiveQuery,
            transferredQuery,
            visitorsQuery,
          ]);

          return {
            month: shortLabel,
            fullMonth: label,
            totalMembers: total.count || 0,
            activeMembers: active.count || 0,
            inactiveMembers: inactive.count || 0,
            transferredMembers: transferred.count || 0,
            visitors: visitors.count || 0,
          };
        })
      );

      return results;
    },
    enabled: !!profile?.church_id,
  });
}

// =================== KPI Card Component ===================
interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: number;
  description?: string;
  isLoading?: boolean;
  variant?: "default" | "primary" | "accent" | "success" | "warning";
}

function KPICard({ title, value, icon: Icon, trend, description, isLoading, variant = "default" }: KPICardProps) {
  const variantStyles = {
    default: { iconBg: "bg-muted", iconColor: "text-muted-foreground" },
    primary: { iconBg: "bg-primary/10", iconColor: "text-primary" },
    accent: { iconBg: "bg-accent/10", iconColor: "text-accent" },
    success: { iconBg: "bg-green-500/10", iconColor: "text-green-600" },
    warning: { iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
  };

  const styles = variantStyles[variant];
  const TrendIcon = trend && trend > 0 ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend && trend > 0 ? "text-green-600" : "text-red-500";

  return (
    <Card>
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
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
                {trend !== undefined && trend !== 0 && (
                  <span className={`flex items-center text-sm font-medium ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    {Math.abs(trend)}%
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =================== Main Component ===================
export default function MemberGrowthPage() {
  const { filters } = useAnalyticsFilters();
  const { data: kpis, isLoading: kpisLoading } = useMemberGrowthKPIs();
  const { data: trendResult, isLoading: trendLoading } = useAcquisitionTrend();
  const { data: retention, isLoading: retentionLoading } = useRetentionMetrics();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyComparison();
  const { data: sixMonthTrend, isLoading: sixMonthLoading } = useSixMonthTrend();

  // State for selected series in comparison chart
  const [selectedSeries, setSelectedSeries] = useState<string[]>(["totalMembers", "activeMembers"]);

  const trendData = trendResult?.data || [];
  const hasTrendData = trendResult?.hasData || false;
  
  const periodLabel = formatDateRangeLabel(filters);

  // Toggle series selection
  const toggleSeries = (seriesKey: string) => {
    setSelectedSeries(prev => 
      prev.includes(seriesKey) 
        ? prev.filter(k => k !== seriesKey)
        : [...prev, seriesKey]
    );
  };

  // Status breakdown for the table
  const statusBreakdown = useMemo(() => {
    if (!kpis?.newMembersByStatus) return [];
    return [
      { status: "Active", count: kpis.newMembersByStatus.active, color: CHART_COLORS.primary },
      { status: "Inactive", count: kpis.newMembersByStatus.inactive, color: CHART_COLORS.muted },
      { status: "Transferred", count: kpis.newMembersByStatus.transferred, color: CHART_COLORS.accent },
    ].filter(s => s.count > 0);
  }, [kpis]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Member Growth"
        description="Track acquisition trends, conversions, and retention metrics"
        icon={TrendingUp}
        backTo="/app/analytics"
      />

      {/* Filter Bar */}
      <AnalyticsFilterBar showServiceFilter={false} />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="New Registrations"
          value={kpis?.newMembers || 0}
          icon={UserPlus}
          trend={kpis?.growthRate}
          description={periodLabel}
          isLoading={kpisLoading}
          variant="primary"
        />
        <KPICard
          title="Total Active"
          value={kpis?.totalActive || 0}
          icon={Users}
          description="Approved members"
          isLoading={kpisLoading}
          variant="accent"
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis?.conversionRate || 0}%`}
          icon={RefreshCw}
          description={`${kpis?.convertedCount || 0} of ${kpis?.totalVisitorsInPeriod || 0} visitors converted`}
          isLoading={kpisLoading}
          variant="success"
        />
        <KPICard
          title="Visitor Return Rate"
          value={`${retention?.returnRate || 0}%`}
          icon={UserCheck}
          description={`${retention?.returnedOnce || 0} of ${retention?.totalVisitors || 0} visitors returned`}
          isLoading={retentionLoading}
          variant="warning"
        />
      </div>

      {/* 6-Month Comparison Chart - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                6-Month Trend Comparison
              </CardTitle>
              <CardDescription>
                Cumulative counts at end of each month
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-4">
              {TREND_SERIES.map((series) => (
                <div key={series.key} className="flex items-center gap-2">
                  <Checkbox
                    id={series.key}
                    checked={selectedSeries.includes(series.key)}
                    onCheckedChange={() => toggleSeries(series.key)}
                  />
                  <Label 
                    htmlFor={series.key} 
                    className="text-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: series.color }}
                    />
                    {series.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sixMonthLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : sixMonthTrend && sixMonthTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={sixMonthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullMonth || ""}
                />
                <Legend />
                {TREND_SERIES.filter(s => selectedSeries.includes(s.key)).map((series) => (
                  <Line
                    key={series.key}
                    type="linear"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={{ fill: series.color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    label={{ position: "top", fontSize: 10, fill: series.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>No data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Acquisition Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Acquisition Trend
            </CardTitle>
            <CardDescription>
              New member registrations & visitor conversions for {periodLabel.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                  />
                  <Legend />
                  <Line
                    type="linear"
                    dataKey="members"
                    name="New Members"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    label={{ position: "top", fontSize: 10, fill: CHART_COLORS.primary }}
                  />
                  <Line
                    type="linear"
                    dataKey="conversions"
                    name="Converted Visitors"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    label={{ position: "top", fontSize: 10, fill: CHART_COLORS.success, dy: -10 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No registrations in this period</p>
                <p className="text-sm">Add members to see acquisition trends</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              6-Month Overview
            </CardTitle>
            <CardDescription>
              Monthly new member comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : monthlyData && monthlyData.some(d => d.newMembers > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="newMembers" name="New Members" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retention & Breakdown Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visitor Retention Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              Visitor Retention
            </CardTitle>
            <CardDescription>
              How well visitors are being retained
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retentionLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : retention && retention.totalVisitors > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Visitors Analyzed</span>
                    <span className="text-2xl font-bold">{retention.totalVisitors}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visitors registered in {periodLabel.toLowerCase()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Returned Once</span>
                    </div>
                    <p className="text-2xl font-bold">{retention.returnedOnce}</p>
                    <p className="text-xs text-muted-foreground">{retention.returnRate}% return rate</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Returned 2+</span>
                    </div>
                    <p className="text-2xl font-bold">{retention.returnedMultiple}</p>
                    <p className="text-xs text-muted-foreground">{retention.engagementRate}% engagement</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <UserMinus className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Never Returned</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {retention.totalVisitors - retention.returnedOnce}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(((retention.totalVisitors - retention.returnedOnce) / retention.totalVisitors) * 100)}% drop-off rate
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No visitors in this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Registration Breakdown
            </CardTitle>
            <CardDescription>
              New registrations by membership status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : statusBreakdown.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusBreakdown.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                          {row.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {Math.round((row.count / (kpis?.newMembers || 1)) * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-bold">{kpis?.newMembers || 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No registrations in this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
