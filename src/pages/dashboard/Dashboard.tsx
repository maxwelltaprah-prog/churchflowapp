import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, UserCheck, Clock, ChevronRight, Building2,
  TrendingUp, Phone, RefreshCw, BarChart3, PieChart, UsersRound, UserMinus, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/hooks/useChurchData";
import {
  useTodayKPIs, useCheckinTrend, useAttendanceTrend,
  useMemberVisitorBreakdown, useBranchOperations,
  useGroupsSnapshot, useDemographicsSnapshot, useServiceQuality,
  useFollowUpList, useDashboardServicesInDateRange
} from "@/hooks/useDashboardData";
import { useConsecutiveMissSignals } from "@/hooks/useConsecutiveMissSignals";
import { DashboardFilterBar, DashboardDateRange } from "@/components/dashboard/DashboardFilterBar";
import { KPICard, StatCard, SectionHeader, EmptyState, ProgressBar, ListItem } from "@/components/dashboard/DashboardCards";
import { LiveCheckinFeed } from "@/components/dashboard/LiveCheckinFeed";
import { startOfMonth, format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];

// Helper to build analytics URL with proper query params
function buildAnalyticsLink(
  path: string,
  dateRange: DashboardDateRange,
  branchId?: string,
  segment?: string
): string {
  const params = new URLSearchParams();
  // Pass dates as from/to params
  params.set("from", format(dateRange.startDate, "yyyy-MM-dd"));
  params.set("to", format(dateRange.endDate, "yyyy-MM-dd"));
  params.set("period", "custom");
  if (branchId) params.set("branch", branchId);
  if (segment) params.set("segment", segment);
  const queryString = params.toString();
  return `/app/analytics/${path}${queryString ? `?${queryString}` : ""}`;
}

export default function Dashboard() {
  const { profile, isChurchAdmin } = useAuth();
  const [branchId, setBranchId] = useState<string | undefined>();
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => ({
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  }));

  const { data: branches } = useBranches();
  
  // Fetch services within the selected date range
  const { data: servicesInRange, isLoading: servicesLoading } = useDashboardServicesInDateRange(
    dateRange.startDate,
    dateRange.endDate,
    branchId
  );

  // Clear selected services when date range or branch changes if they're no longer valid
  useEffect(() => {
    if (servicesInRange && serviceIds.length > 0) {
      const validServiceIds = servicesInRange.map(s => s.id);
      const filteredIds = serviceIds.filter(id => validServiceIds.includes(id));
      if (filteredIds.length !== serviceIds.length) {
        setServiceIds(filteredIds);
      }
    }
  }, [servicesInRange, serviceIds]);

  // All dashboard data hooks - pass dateRange and serviceIds
  const { data: kpis, isLoading: kpisLoading, refetch } = useTodayKPIs(branchId, serviceIds, dateRange);
  const { data: checkinTrend, isLoading: trendLoading } = useCheckinTrend(branchId, serviceIds, dateRange);
  const { data: attendTrend } = useAttendanceTrend(branchId, serviceIds, dateRange);
  const { data: mvBreakdown } = useMemberVisitorBreakdown(branchId, serviceIds, dateRange);
  const { data: engagement, isLoading: engagementLoading } = useConsecutiveMissSignals(branchId);
  const { data: branchOps } = useBranchOperations(dateRange);
  const { data: groups } = useGroupsSnapshot(branchId, dateRange);
  const { data: demographics } = useDemographicsSnapshot(branchId, serviceIds, dateRange);
  const { data: serviceQuality } = useServiceQuality(branchId, serviceIds, dateRange);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpList(branchId);

  const showBranchFilter = isChurchAdmin() && (branches?.length || 0) > 1;

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <DashboardFilterBar
        branches={branches || []}
        services={servicesInRange || []}
        selectedBranchId={branchId}
        selectedServiceIds={serviceIds}
        dateRange={dateRange}
        onBranchChange={setBranchId}
        onServiceChange={setServiceIds}
        onDateRangeChange={setDateRange}
        onRefresh={() => refetch()}
        showBranchFilter={showBranchFilter}
        isLoading={kpisLoading}
        isServicesLoading={servicesLoading}
      />

      {/* SECTION 1: KPI Cards - with deep links to analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Attendance" value={kpis?.totalAttendance ?? 0} icon={Users} href={buildAnalyticsLink("drilldown", dateRange, branchId, "all")} isLoading={kpisLoading} change={kpis?.change} />
        <KPICard title="Visitors" value={kpis?.visitorsToday ?? 0} icon={UserPlus} href={buildAnalyticsLink("drilldown", dateRange, branchId, "visitors")} isLoading={kpisLoading} variant="accent" />
        <KPICard title="First-Timers" value={kpis?.firstTimersToday ?? 0} icon={UserCheck} href={buildAnalyticsLink("drilldown", dateRange, branchId, "first_timers")} isLoading={kpisLoading} variant="accent" />
        <KPICard title="Returning Visitors" value={kpis?.returningVisitorsToday ?? 0} icon={RefreshCw} href={buildAnalyticsLink("drilldown", dateRange, branchId, "returning_visitors")} isLoading={kpisLoading} />
        <KPICard title="Late Arrivals" value={kpis?.lateArrivals ?? 0} icon={Clock} description=">30 min" isLoading={kpisLoading} variant="muted" />
      </div>

      {/* SECTION 2: Live Check-in Activity - Full Width */}
      <LiveCheckinFeed branchId={branchId} maxItems={10} />

      {/* SECTION 3: Check-in Flow Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SectionHeader title="Check-in Flow" description="Arrival pattern by hour" icon={BarChart3} />
            {checkinTrend?.peakTime && checkinTrend?.peakCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Peak: {checkinTrend.peakTime} ({checkinTrend.peakCount})
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            {trendLoading ? <Skeleton className="h-full w-full" /> : !checkinTrend?.hasData ? (
              <EmptyState icon={BarChart3} title="No check-ins yet" description={checkinTrend?.isTimeOfDay ? "Data appears as members arrive" : "No services recorded for this period"} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkinTrend.data} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0.7} />
                    </linearGradient>
                    <filter id="peakGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur">
                        <animate 
                          attributeName="stdDeviation" 
                          values="2;5;2" 
                          dur="1.5s" 
                          repeatCount="indefinite"
                        />
                      </feGaussianBlur>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs" 
                    tickFormatter={(v) => v.replace(":00", "")} 
                    interval={checkinTrend.isTimeOfDay ? 1 : "preserveStartEnd"}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis 
                    className="text-xs" 
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={(value: number) => [`${value} check-in${value !== 1 ? "s" : ""}`, "Arrivals"]}
                    labelFormatter={(label) => `${label}`}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  />
                  <Bar 
                    dataKey="checkins" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  >
                    {checkinTrend.data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.time === checkinTrend.peakTime && checkinTrend.peakCount > 0 ? "url(#peakGradient)" : "url(#barGradient)"}
                        filter={entry.time === checkinTrend.peakTime && checkinTrend.peakCount > 0 ? "url(#peakGlow)" : undefined}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {checkinTrend?.hasData && (
            <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-xs text-muted-foreground">Regular arrivals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500 shadow-[0_0_6px_hsl(38_92%_50%/0.6)]" />
                <span className="text-xs text-muted-foreground">Peak arrival time</span>
              </div>
            </div>
          )}
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

        {/* Engagement Signals - Clickable */}
        <Link to={`/app/analytics/engagement${branchId ? `?branch=${branchId}` : ""}`}>
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full">
            <CardHeader className="pb-3">
              <SectionHeader title="Engagement Signals" icon={AlertTriangle} />
            </CardHeader>
            <CardContent className="space-y-3">
              {engagementLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <UserMinus className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-foreground">Missed 3+ Services</span>
                    </div>
                    <Badge variant="destructive" className="text-lg px-3">
                      {engagement?.missedCount || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-foreground">Returnees</span>
                    </div>
                    <Badge className="bg-green-600 hover:bg-green-700 text-lg px-3">
                      {engagement?.returneeCount || 0}
                    </Badge>
                  </div>
                </>
              )}
              <div className="flex items-center text-xs text-primary font-medium pt-1">
                View details <ChevronRight className="w-3 h-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

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

      {/* Branch Leaderboard */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader title="Branch Leaderboard" icon={Building2} /></CardHeader>
        <CardContent>
          {!branchOps?.leaderboard?.length ? <EmptyState icon={Building2} title="No branches" description="Add branches to track" /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {branchOps.leaderboard.slice(0, 5).map((b, i) => (
                <ListItem key={b.id} name={`${i + 1}. ${b.name}`} value={b.attendance} badge={b.change !== 0 ? `${b.change > 0 ? "+" : ""}${b.change}%` : undefined} badgeVariant={b.change > 0 ? "default" : b.change < 0 ? "destructive" : "outline"} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New People to Follow Up */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader title="New People to Follow Up" icon={UserPlus} action={<Link to={buildAnalyticsLink("drilldown", dateRange, branchId, "first_timers")}><Button variant="ghost" size="sm">View all</Button></Link>} /></CardHeader>
        <CardContent>
          {followUpsLoading ? <Skeleton className="h-24" /> : !followUps?.length ? <EmptyState icon={UserPlus} title="No new visitors today" description="First-timers will appear here" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

    </div>
  );
}
