import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, UserCheck, Clock, AlertCircle, ChevronRight, Building2,
  TrendingUp, Phone, RefreshCw, BarChart3, PieChart, Activity, MessageSquare,
  ShieldCheck, UsersRound, MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/hooks/useChurchData";
import {
  useTodayKPIs, useCheckinTrend, useAttendanceTrend,
  useMemberVisitorBreakdown, useEngagementSignals, useBranchOperations,
  useGroupsSnapshot, useDemographicsSnapshot, useServiceQuality,
  useBroadcastImpact, useDataHealth, useFollowUpList, useLikelyAbsentees,
  useTodayServices, useRecentServices, DateRange
} from "@/hooks/useDashboardData";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { KPICard, StatCard, SectionHeader, EmptyState, ProgressBar, ListItem } from "@/components/dashboard/DashboardCards";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];

// Helper to build analytics URL with proper query params
function buildAnalyticsLink(
  path: string,
  dateRange: DateRange,
  branchId?: string,
  segment?: string
): string {
  const params = new URLSearchParams();
  if (dateRange === "today") params.set("period", "today");
  else if (dateRange === "this_week") params.set("period", "this_week");
  else if (dateRange === "this_month") params.set("period", "this_month");
  if (branchId) params.set("branch", branchId);
  if (segment) params.set("segment", segment);
  const queryString = params.toString();
  return `/app/analytics/${path}${queryString ? `?${queryString}` : ""}`;
}

export default function Dashboard() {
  const { profile, isChurchAdmin } = useAuth();
  const [branchId, setBranchId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>("today");

  const { data: branches } = useBranches();
  const { data: todayServices } = useTodayServices(branchId);
  const { data: recentServices } = useRecentServices(branchId);
  const services = [...(todayServices || []), ...(recentServices || [])].filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);

  // All dashboard data hooks
  const { data: kpis, isLoading: kpisLoading, refetch } = useTodayKPIs(branchId, serviceId, dateRange);
  const { data: checkinTrend, isLoading: trendLoading } = useCheckinTrend(branchId, serviceId, dateRange);
  const { data: attendTrend } = useAttendanceTrend(serviceId, branchId);
  const { data: mvBreakdown } = useMemberVisitorBreakdown(branchId, dateRange);
  const { data: engagement } = useEngagementSignals(branchId);
  const { data: branchOps } = useBranchOperations(dateRange);
  const { data: groups } = useGroupsSnapshot(branchId);
  const { data: demographics } = useDemographicsSnapshot(branchId);
  const { data: serviceQuality } = useServiceQuality(branchId, dateRange);
  const { data: broadcasts } = useBroadcastImpact(branchId);
  const { data: dataHealth } = useDataHealth(branchId);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpList(branchId);
  const { data: absentees, isLoading: absenteesLoading } = useLikelyAbsentees(branchId);

  const showBranchFilter = isChurchAdmin() && (branches?.length || 0) > 1;

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <DashboardFilterBar
        branches={branches || []}
        services={services}
        selectedBranchId={branchId}
        selectedServiceId={serviceId}
        dateRange={dateRange}
        onBranchChange={setBranchId}
        onServiceChange={setServiceId}
        onDateRangeChange={setDateRange}
        onRefresh={() => refetch()}
        showBranchFilter={showBranchFilter}
        isLoading={kpisLoading}
      />

      {/* SECTION 1: KPI Cards - with deep links to analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Attendance" value={kpis?.totalAttendance ?? 0} icon={Users} href={buildAnalyticsLink("drilldown", dateRange, branchId, "all")} isLoading={kpisLoading} change={kpis?.change} />
        <KPICard title="Visitors" value={kpis?.visitorsToday ?? 0} icon={UserPlus} href={buildAnalyticsLink("drilldown", dateRange, branchId, "visitors")} isLoading={kpisLoading} variant="accent" />
        <KPICard title="First-Timers" value={kpis?.firstTimersToday ?? 0} icon={UserCheck} href={buildAnalyticsLink("drilldown", dateRange, branchId, "first_timers")} isLoading={kpisLoading} variant="accent" />
        <KPICard title="Returning Visitors" value={kpis?.returningVisitorsToday ?? 0} icon={RefreshCw} href={buildAnalyticsLink("drilldown", dateRange, branchId, "returning_visitors")} isLoading={kpisLoading} />
        <KPICard title="Late Arrivals" value={kpis?.lateArrivals ?? 0} icon={Clock} description=">30 min" isLoading={kpisLoading} variant="muted" />
      </div>

      {/* SECTION 2: Check-in Flow */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader title="Check-in Flow" description="Arrival pattern over time" icon={TrendingUp} />
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            {trendLoading ? <Skeleton className="h-full w-full" /> : !checkinTrend?.hasData ? (
              <EmptyState icon={TrendingUp} title="No check-ins yet" description={checkinTrend?.isTimeOfDay ? "Data appears as members arrive" : "No services recorded for this period"} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={checkinTrend.data}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" className="text-xs" tickFormatter={(v) => v.replace(":00", "")} interval={checkinTrend.isTimeOfDay ? 3 : "preserveStartEnd"} />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="checkins" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#cg)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3-6: Metrics Grid */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Trends */}
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Short-Term Trends" icon={BarChart3} /></CardHeader>
          <CardContent className="space-y-3">
            <StatCard label="Week Change" value={`${(attendTrend?.weekChange || 0) > 0 ? "+" : ""}${attendTrend?.weekChange || 0}%`} change={attendTrend?.weekChange} />
            <StatCard label="MTD Attendance" value={attendTrend?.mtdCount || 0} />
            <StatCard label="vs Last Month" value={`${(attendTrend?.monthChange || 0) > 0 ? "+" : ""}${attendTrend?.monthChange || 0}%`} change={attendTrend?.monthChange} />
          </CardContent>
        </Card>

        {/* Members vs Visitors */}
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Members vs Visitors" icon={UsersRound} /></CardHeader>
          <CardContent className="space-y-3">
            <StatCard label="Members Attended" value={mvBreakdown?.members || 0} />
            <StatCard label="Visitors Attended" value={mvBreakdown?.visitors || 0} />
            <StatCard label="Visitor Return Rate" value={`${mvBreakdown?.visitorToReturning || 0}%`} description="90-day" />
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Engagement Signals" icon={Activity} /></CardHeader>
          <CardContent className="space-y-2">
            <ProgressBar label="Active (4 wks)" value={engagement?.active || 0} max={(engagement?.active || 0) + (engagement?.atRisk || 0) + (engagement?.inactive || 0)} color="success" />
            <ProgressBar label="At Risk (4-8 wks)" value={engagement?.atRisk || 0} max={(engagement?.active || 0) + (engagement?.atRisk || 0) + (engagement?.inactive || 0)} color="warning" />
            <ProgressBar label="Inactive (12+ wks)" value={engagement?.inactive || 0} max={(engagement?.active || 0) + (engagement?.atRisk || 0) + (engagement?.inactive || 0)} color="destructive" />
          </CardContent>
        </Card>

        {/* Service Quality */}
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Service Quality" icon={Clock} /></CardHeader>
          <CardContent className="space-y-3">
            <StatCard label="Late Arrival Rate" value={`${serviceQuality?.lateRate || 0}%`} />
            <StatCard label="Early Arrival Rate" value={`${serviceQuality?.earlyRate || 0}%`} />
            <StatCard label="Total Check-ins" value={serviceQuality?.totalCheckins || 0} />
          </CardContent>
        </Card>
      </div>

      {/* SECTION 7-8: Groups & Demographics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Groups Snapshot" icon={UsersRound} action={<Link to="/app/groups"><Button variant="ghost" size="sm">View all</Button></Link>} /></CardHeader>
          <CardContent>
            {!groups?.topGroups?.length ? <EmptyState icon={UsersRound} title="No groups" description="Create groups to track ministry engagement" /> : (
              <div className="space-y-2">
                {groups.topGroups.map((g) => <ListItem key={g.id} name={g.name} value={g.members} href={`/app/groups`} />)}
                <div className="pt-2 text-sm text-muted-foreground">{groups.noGroupPercent}% of members have no group assigned</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Demographics" icon={PieChart} /></CardHeader>
          <CardContent>
            {demographics?.gender?.length ? (
              <div className="flex items-center gap-6">
                <div className="h-[120px] w-[120px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={demographics.gender} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                        {demographics.gender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {demographics.gender.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState icon={PieChart} title="No data" description="Demographics will appear here" />}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 9-11: Operations & Data Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Branch Leaderboard" icon={Building2} /></CardHeader>
          <CardContent>
            {!branchOps?.leaderboard?.length ? <EmptyState icon={Building2} title="No branches" description="Add branches to track" /> : (
              <div className="space-y-2">
                {branchOps.leaderboard.slice(0, 5).map((b, i) => (
                  <ListItem key={b.id} name={`${i + 1}. ${b.name}`} value={b.attendance} badge={b.change !== 0 ? `${b.change > 0 ? "+" : ""}${b.change}%` : undefined} badgeVariant={b.change > 0 ? "default" : b.change < 0 ? "destructive" : "outline"} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Broadcasts" icon={MessageSquare} /></CardHeader>
          <CardContent className="space-y-3">
            <StatCard label="Sent (30 days)" value={broadcasts?.sent || 0} />
            <StatCard label="Est. Reach" value={broadcasts?.estimatedReach || 0} />
            <StatCard label="Read Rate" value={`${broadcasts?.readRate || 0}%`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Data Health" icon={ShieldCheck} /></CardHeader>
          <CardContent className="space-y-2">
            {dataHealth?.pendingApprovals ? <ListItem name="Pending Approvals" value={dataHealth.pendingApprovals} badge="Action" badgeVariant="destructive" href="/app/members?approval=pending" /> : null}
            {dataHealth?.missingPhone ? <ListItem name="Missing Phone" value={dataHealth.missingPhone} badge="Warn" badgeVariant="outline" /> : null}
            {dataHealth?.duplicates ? <ListItem name="Duplicates Detected" value={dataHealth.duplicates} badge="Warn" badgeVariant="outline" /> : null}
            {!dataHealth?.pendingApprovals && !dataHealth?.missingPhone && !dataHealth?.duplicates && <EmptyState icon={ShieldCheck} title="All clear" description="No data issues detected" />}
          </CardContent>
        </Card>
      </div>

      {/* ACTIONABLE LISTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><SectionHeader title="New People to Follow Up" icon={UserPlus} action={<Link to={buildAnalyticsLink("drilldown", "today", branchId, "first_timers")}><Button variant="ghost" size="sm">View all</Button></Link>} /></CardHeader>
          <CardContent>
            {followUpsLoading ? <Skeleton className="h-24" /> : !followUps?.length ? <EmptyState icon={UserPlus} title="No new visitors today" description="First-timers will appear here" /> : (
              <div className="space-y-2">
                {followUps.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="font-medium text-sm">{p.name}</p><Badge variant="secondary" className="text-xs capitalize mt-1">{p.status?.replace("_", " ")}</Badge></div>
                    {p.phone && <a href={`tel:${p.phone}`} className="p-2 hover:bg-muted rounded-md"><Phone className="w-4 h-4 text-primary" /></a>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><SectionHeader title="Likely Absent Today" icon={AlertCircle} /></CardHeader>
          <CardContent>
            {absenteesLoading ? <Skeleton className="h-24" /> : !absentees?.length ? <EmptyState icon={Users} title="All regulars present" description="Or not enough data yet" /> : (
              <div className="space-y-2">
                {absentees.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">Usually attends {p.usualAttendance}x/month</p></div>
                    {p.phone && <a href={`tel:${p.phone}`} className="p-2 hover:bg-muted rounded-md"><Phone className="w-4 h-4 text-primary" /></a>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
