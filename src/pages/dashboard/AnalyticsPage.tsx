import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  BarChart3,
  Activity,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format, eachDayOfInterval, differenceInDays } from "date-fns";

// Hook for filtered analytics stats
function useFilteredAnalyticsStats() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();
  
  return useQuery({
    queryKey: ["analytics-stats", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      
      // Build member query with filters
      let memberQuery = supabase
        .from("members")
        .select("id, created_at, membership_status", { count: "exact" })
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved");
      
      memberQuery = applyBranchFilter(memberQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      
      const { count: totalMembers, data: membersData } = await memberQuery;
      
      // New members in date range
      const newMembersInRange = membersData?.filter(m => {
        const createdAt = new Date(m.created_at);
        return createdAt >= filters.startDate && createdAt <= filters.endDate;
      }).length || 0;
      
      // Visitors in date range
      const visitorsCount = membersData?.filter(m => 
        m.membership_status === "visitor" || m.membership_status === "first_timer"
      ).length || 0;
      
      // Build attendance query with filters
      let attendanceQuery = supabase
        .from("attendance")
        .select("id, checked_in_at", { count: "exact" })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());
      
      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      
      const { count: attendanceCount } = await attendanceQuery;
      
      // Services count in date range
      let servicesQuery = supabase
        .from("services")
        .select("id", { count: "exact" })
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"));
      
      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      
      const { count: servicesCount } = await servicesQuery;
      
      // Calculate avg attendance per service
      const avgAttendance = servicesCount && servicesCount > 0 
        ? Math.round((attendanceCount || 0) / servicesCount) 
        : 0;
      
      return {
        totalMembers: totalMembers || 0,
        newMembers: newMembersInRange,
        totalAttendance: attendanceCount || 0,
        servicesCount: servicesCount || 0,
        avgAttendance,
        visitors: visitorsCount,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// Hook for attendance trend chart data
function useAttendanceTrendChart() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();
  
  return useQuery({
    queryKey: ["attendance-trend-chart", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      let query = supabase
        .from("attendance")
        .select("checked_in_at")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());
      
      query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      
      const { data: attendance } = await query;
      
      // Group by day
      const daysDiff = differenceInDays(filters.endDate, filters.startDate);
      const dateFormat = daysDiff > 14 ? "MMM d" : "EEE";
      
      const days = eachDayOfInterval({ start: filters.startDate, end: filters.endDate });
      
      return days.map(day => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        
        const count = attendance?.filter(a => {
          const checkinDate = new Date(a.checked_in_at);
          return checkinDate >= dayStart && checkinDate <= dayEnd;
        }).length || 0;
        
        return {
          date: format(day, dateFormat),
          fullDate: format(day, "MMM d, yyyy"),
          attendance: count,
        };
      });
    },
    enabled: !!profile?.church_id,
  });
}

export default function AnalyticsPage() {
  const { filters } = useAnalyticsFilters();
  const { data: stats, isLoading: statsLoading } = useFilteredAnalyticsStats();
  const { data: trendData, isLoading: trendLoading } = useAttendanceTrendChart();
  
  const periodLabel = formatDateRangeLabel(filters);
  
  const summaryCards = useMemo(() => [
    {
      title: "Total Attendance",
      value: stats?.totalAttendance || 0,
      icon: UserCheck,
      description: `Check-ins ${periodLabel.toLowerCase()}`,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "New Members",
      value: stats?.newMembers || 0,
      icon: UserPlus,
      description: `Joined ${periodLabel.toLowerCase()}`,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Services Held",
      value: stats?.servicesCount || 0,
      icon: Calendar,
      description: `${periodLabel}`,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Avg. per Service",
      value: stats?.avgAttendance || 0,
      icon: TrendingUp,
      description: "Average attendance",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ], [stats, periodLabel]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Analytics Overview</h1>
        <p className="text-muted-foreground">
          Track attendance trends, member growth, and service performance
        </p>
      </div>
      
      {/* Global Filter Bar */}
      <AnalyticsFilterBar />
      
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Attendance Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Attendance Trend</CardTitle>
            <CardDescription>
              Daily check-ins for {periodLabel.toLowerCase()}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : trendData && trendData.length > 0 && trendData.some(d => d.attendance > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#attendanceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>No attendance data for this period</p>
              <p className="text-sm">Record check-ins to see trends here</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Quick Links to Detailed Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
          <Link to="/app/analytics/attendance">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-base mt-3">Attendance Analytics</CardTitle>
              <CardDescription>Service attendance patterns and trends</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        
        <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
          <Link to="/app/analytics/demographics">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-base mt-3">Demographics</CardTitle>
              <CardDescription>Age, gender, and membership breakdown</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        
        <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
          <Link to="/app/analytics/members">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-base mt-3">Member Growth</CardTitle>
              <CardDescription>Acquisition and retention trends</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        
        <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
          <Link to="/app/analytics/groups">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-base mt-3">Groups & Ministries</CardTitle>
              <CardDescription>Group participation and engagement</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        
        <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
          <Link to="/app/analytics/quality">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-base mt-3">Service Quality</CardTitle>
              <CardDescription>Operational metrics and data completeness</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
