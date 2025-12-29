import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronRight,
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
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  isWithinInterval,
} from "date-fns";

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  success: "hsl(142 76% 36%)",
  warning: "hsl(38 92% 50%)",
  muted: "hsl(var(--muted-foreground))",
};

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
        member: newMembers.filter(m => m.membership_status === "member").length,
        visitor: newMembers.filter(m => m.membership_status === "visitor").length,
        first_timer: newMembers.filter(m => m.membership_status === "first_timer").length,
        new_convert: newMembers.filter(m => m.membership_status === "new_convert").length,
      };

      // Total active members
      const totalActive = members.filter(m => m.is_active && m.approval_status === "approved").length;

      // Conversion: members who were visitors/first-timers and became members
      // (This is an approximation - ideally we'd track status changes)
      const convertedCount = members.filter(m => 
        m.membership_status === "member" || m.membership_status === "new_convert"
      ).length;
      const totalRegistered = members.length;
      const conversionRate = totalRegistered > 0 ? (convertedCount / totalRegistered) * 100 : 0;

      return {
        newMembers: newMembers.length,
        prevNewMembers: prevNewMembers.length,
        growthRate: Math.round(growthRate),
        totalActive,
        newMembersByStatus,
        conversionRate: Math.round(conversionRate),
        totalRegistered,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Acquisition Trend Hook ===================
function useAcquisitionTrend() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["acquisition-trend", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("members")
        .select("id, created_at, membership_status")
        .eq("church_id", profile.church_id)
        .gte("created_at", filters.startDate.toISOString())
        .lte("created_at", filters.endDate.toISOString());

      query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: members } = await query;

      const daysDiff = differenceInDays(filters.endDate, filters.startDate);
      
      // Choose interval based on date range
      let intervals: Date[];
      let dateFormat: string;
      let getIntervalEnd: (date: Date) => Date;

      if (daysDiff <= 14) {
        intervals = eachDayOfInterval({ start: filters.startDate, end: filters.endDate });
        dateFormat = "MMM d";
        getIntervalEnd = (d) => {
          const end = new Date(d);
          end.setHours(23, 59, 59, 999);
          return end;
        };
      } else if (daysDiff <= 90) {
        intervals = eachWeekOfInterval({ start: filters.startDate, end: filters.endDate });
        dateFormat = "'W'w";
        getIntervalEnd = (d) => endOfWeek(d);
      } else {
        intervals = eachMonthOfInterval({ start: filters.startDate, end: filters.endDate });
        dateFormat = "MMM yyyy";
        getIntervalEnd = (d) => endOfMonth(d);
      }

      return intervals.map((intervalStart, idx) => {
        const intervalEnd = getIntervalEnd(intervalStart);
        
        const periodMembers = (members || []).filter(m => {
          const createdAt = new Date(m.created_at);
          return createdAt >= intervalStart && createdAt <= intervalEnd;
        });

        const newMembers = periodMembers.filter(m => 
          m.membership_status === "member" || m.membership_status === "new_convert"
        ).length;
        const visitors = periodMembers.filter(m => 
          m.membership_status === "visitor" || m.membership_status === "first_timer"
        ).length;

        return {
          date: format(intervalStart, dateFormat),
          fullDate: format(intervalStart, "MMM d, yyyy"),
          total: periodMembers.length,
          members: newMembers,
          visitors,
        };
      });
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Retention Metrics Hook ===================
function useRetentionMetrics() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["retention-metrics", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Get members created in the selected period
      let newMembersQuery = supabase
        .from("members")
        .select("id, created_at")
        .eq("church_id", profile.church_id)
        .gte("created_at", filters.startDate.toISOString())
        .lte("created_at", filters.endDate.toISOString());

      newMembersQuery = applyBranchFilter(newMembersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: newMembers } = await newMembersQuery;
      const newMemberIds = (newMembers || []).map(m => m.id);

      if (newMemberIds.length === 0) {
        return {
          totalNew: 0,
          returnedOnce: 0,
          returnedMultiple: 0,
          returnRate: 0,
          engagementRate: 0,
        };
      }

      // Get attendance for these new members
      let attendanceQuery = supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .in("member_id", newMemberIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Count attendance per member
      const attendanceCounts: Record<string, number> = {};
      (attendance || []).forEach(a => {
        attendanceCounts[a.member_id] = (attendanceCounts[a.member_id] || 0) + 1;
      });

      const returnedOnce = Object.values(attendanceCounts).filter(c => c >= 1).length;
      const returnedMultiple = Object.values(attendanceCounts).filter(c => c >= 2).length;

      return {
        totalNew: newMemberIds.length,
        returnedOnce,
        returnedMultiple,
        returnRate: Math.round((returnedOnce / newMemberIds.length) * 100),
        engagementRate: Math.round((returnedMultiple / newMemberIds.length) * 100),
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
  const { data: trendData, isLoading: trendLoading } = useAcquisitionTrend();
  const { data: retention, isLoading: retentionLoading } = useRetentionMetrics();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyComparison();

  const periodLabel = formatDateRangeLabel(filters);

  // Status breakdown for the table
  const statusBreakdown = useMemo(() => {
    if (!kpis?.newMembersByStatus) return [];
    return [
      { status: "Members", count: kpis.newMembersByStatus.member, color: CHART_COLORS.primary },
      { status: "Visitors", count: kpis.newMembersByStatus.visitor, color: CHART_COLORS.accent },
      { status: "First Timers", count: kpis.newMembersByStatus.first_timer, color: CHART_COLORS.warning },
      { status: "New Converts", count: kpis.newMembersByStatus.new_convert, color: CHART_COLORS.success },
    ].filter(s => s.count > 0);
  }, [kpis]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Member Growth</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Member Growth</h1>
        <p className="text-muted-foreground">
          Track acquisition trends, conversions, and retention metrics
        </p>
      </div>

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
          description="Visitors → Members"
          isLoading={kpisLoading}
          variant="success"
        />
        <KPICard
          title="Return Rate"
          value={`${retention?.returnRate || 0}%`}
          icon={UserCheck}
          description="New members who returned"
          isLoading={retentionLoading}
          variant="warning"
        />
      </div>

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
              New registrations over {periodLabel.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : trendData && trendData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="membersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="members"
                    name="Members"
                    stroke={CHART_COLORS.primary}
                    fill="url(#membersGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Visitors"
                    stroke={CHART_COLORS.accent}
                    fill="url(#visitorsGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No new registrations in this period</p>
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
        {/* Retention Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              Retention Metrics
            </CardTitle>
            <CardDescription>
              How well new members are being retained
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retentionLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : retention && retention.totalNew > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">New Members Analyzed</span>
                    <span className="text-2xl font-bold">{retention.totalNew}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Members registered in {periodLabel.toLowerCase()}
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
                    {retention.totalNew - retention.returnedOnce}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(((retention.totalNew - retention.returnedOnce) / retention.totalNew) * 100)}% drop-off rate
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No new members in this period</p>
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
