import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, Clock, ChevronRight, Building2,
  TrendingUp, Phone, RefreshCw, BarChart3, PieChart, UsersRound, UserMinus, AlertTriangle, UserCheck, Cake, Gift, CalendarHeart, Star
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
import { useBirthdayData } from "@/hooks/useBirthdayData";
import { useAnniversaryData } from "@/hooks/useAnniversaryData";
import { useDayBornDistribution } from "@/hooks/useDayBornDistribution";
import { DashboardFilterBar, DashboardDateRange } from "@/components/dashboard/DashboardFilterBar";
import { KPICard, StatCard, SectionHeader, EmptyState, ProgressBar, ListItem } from "@/components/dashboard/DashboardCards";
import { LiveCheckinFeed } from "@/components/dashboard/LiveCheckinFeed";
import { startOfMonth, format, parseISO, isToday } from "date-fns";

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
  // Date range only controls which services are available for selection
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

  // Auto-select the most recent service when services load and none are selected
  useEffect(() => {
    if (servicesInRange && servicesInRange.length > 0 && serviceIds.length === 0) {
      // Services are ordered by date desc, so first one is most recent
      const mostRecentService = servicesInRange[0];
      setServiceIds([mostRecentService.id]);
    }
  }, [servicesInRange]);

  // Clear selected services when date range or branch changes if they're no longer valid
  useEffect(() => {
    if (servicesInRange && serviceIds.length > 0) {
      const validServiceIds = servicesInRange.map(s => s.id);
      const filteredIds = serviceIds.filter(id => validServiceIds.includes(id));
      if (filteredIds.length !== serviceIds.length) {
        // If all selected services are invalid, select the most recent one
        if (filteredIds.length === 0 && servicesInRange.length > 0) {
          setServiceIds([servicesInRange[0].id]);
        } else {
          setServiceIds(filteredIds);
        }
      }
    }
  }, [servicesInRange]);

  // All dashboard data hooks - pass only serviceIds (service-driven filtering)
  // The dateRange is only used to determine which services are available
  const { data: kpis, isLoading: kpisLoading, refetch } = useTodayKPIs(branchId, serviceIds);
  const { data: checkinTrend, isLoading: trendLoading } = useCheckinTrend(branchId, serviceIds);
  const { data: attendTrend } = useAttendanceTrend(branchId, serviceIds);
  const { data: engagement, isLoading: engagementLoading } = useConsecutiveMissSignals(branchId);
  const { data: branchOps } = useBranchOperations(dateRange);
  const { data: groups } = useGroupsSnapshot(branchId, serviceIds);
  const { data: demographics } = useDemographicsSnapshot(branchId, serviceIds);
  const { data: serviceQuality } = useServiceQuality(branchId, serviceIds);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpList(branchId);
  const { data: birthdays, isLoading: birthdaysLoading } = useBirthdayData(branchId);
  const { data: anniversaries, isLoading: anniversariesLoading } = useAnniversaryData(branchId);
  const { data: dayBornData, isLoading: dayBornLoading } = useDayBornDistribution(branchId, serviceIds);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Attendance" value={kpis?.totalAttendance ?? 0} icon={Users} href={buildAnalyticsLink("drilldown", dateRange, branchId, "all")} isLoading={kpisLoading} change={kpis?.change} variant="blue" />
        <KPICard title="Members" value={kpis?.uniqueMembers ?? 0} icon={UserCheck} href={`/app/analytics/members-attended${serviceIds.length > 0 ? `?services=${serviceIds.join(",")}` : ""}${branchId ? `&branch=${branchId}` : ""}`} isLoading={kpisLoading} description="Unique check-ins" variant="purple" />
        <KPICard title="New Visitors" value={kpis?.newVisitors ?? 0} icon={UserPlus} href={`/app/visitors${serviceIds.length > 0 ? `?services=${serviceIds.join(",")}` : ""}`} isLoading={kpisLoading} variant="teal" />
        <KPICard title="Returning Visitors" value={kpis?.returningVisitors ?? 0} icon={RefreshCw} href={`/app/visitors${serviceIds.length > 0 ? `?services=${serviceIds.join(",")}` : ""}`} isLoading={kpisLoading} variant="orange" />
      </div>

      {/* SECTION 2: Live Check-in Activity - Full Width */}
      <LiveCheckinFeed branchId={branchId} maxItems={10} />

      {/* SECTION 3: Check-in Flow Chart */}
      <Card className="border-0 bg-card">
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
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Special Updates - Birthdays & Anniversaries */}
        <Card className="lg:col-span-1 border-0 bg-gradient-to-br from-kpi-pink/5 to-kpi-purple/5">
          <CardHeader className="pb-3">
            <SectionHeader title="Special Updates" icon={Gift} />
          </CardHeader>
          <CardContent className="space-y-4">
            {(birthdaysLoading || anniversariesLoading) ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                {/* Birthdays Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-pink-500" />
                    <span className="text-sm font-semibold">Birthdays</span>
                  </div>
                  
                  {/* Past Week Birthdays */}
                  <div className="pl-2 border-l-2 border-muted">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Past Week</span>
                      {(birthdays?.pastWeek?.length || 0) > 0 && (
                        <Badge variant="secondary" className="text-xs h-5">{birthdays?.pastWeek?.length}</Badge>
                      )}
                    </div>
                    {!birthdays?.pastWeek?.length ? (
                      <p className="text-xs text-muted-foreground">None</p>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {birthdays.pastWeek.slice(0, 3).map((member) => (
                          <Link
                            key={member.id}
                            to={`/app/members/${member.id}`}
                            className="flex items-center justify-between p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                {member.photo_url ? (
                                  <img src={member.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <Cake className="w-3 h-3 text-pink-500" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium truncate">{member.full_name}</span>
                                {member.day_born && (
                                  <span className="text-[10px] text-pink-600 capitalize">{member.day_born}-born</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {format(parseISO(member.birthday_date), "MMM d")}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Birthdays */}
                  <div className="pl-2 border-l-2 border-pink-300">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-foreground">Upcoming</span>
                      {(birthdays?.upcoming?.length || 0) > 0 && (
                        <Badge className="bg-pink-500 text-xs h-5">{birthdays?.upcoming?.length}</Badge>
                      )}
                    </div>
                    {!birthdays?.upcoming?.length ? (
                      <p className="text-xs text-muted-foreground">None this week</p>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {birthdays.upcoming.slice(0, 3).map((member) => (
                          <Link
                            key={member.id}
                            to={`/app/members/${member.id}`}
                            className="flex items-center justify-between p-1.5 rounded-md bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                {member.photo_url ? (
                                  <img src={member.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <Cake className="w-3 h-3 text-pink-500" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium truncate">{member.full_name}</span>
                                {member.day_born && (
                                  <span className="text-[10px] text-pink-600 capitalize">{member.day_born}-born</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isToday(parseISO(member.birthday_date)) && (
                                <Badge className="bg-green-600 text-[10px] h-4 px-1">Today!</Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {format(parseISO(member.birthday_date), "MMM d")}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Anniversaries Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarHeart className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">Anniversaries</span>
                  </div>
                  
                  {/* Past Week Anniversaries */}
                  <div className="pl-2 border-l-2 border-muted">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Past Week</span>
                      {(anniversaries?.pastWeek?.length || 0) > 0 && (
                        <Badge variant="secondary" className="text-xs h-5">{anniversaries?.pastWeek?.length}</Badge>
                      )}
                    </div>
                    {!anniversaries?.pastWeek?.length ? (
                      <p className="text-xs text-muted-foreground">None</p>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {anniversaries.pastWeek.slice(0, 3).map((member) => (
                          <Link
                            key={member.id}
                            to={`/app/members/${member.id}`}
                            className="flex items-center justify-between p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                {member.photo_url ? (
                                  <img src={member.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <CalendarHeart className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                              <span className="text-xs font-medium truncate">{member.full_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {member.years} yr{member.years !== 1 ? 's' : ''}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Anniversaries */}
                  <div className="pl-2 border-l-2 border-amber-300">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-foreground">Upcoming</span>
                      {(anniversaries?.upcoming?.length || 0) > 0 && (
                        <Badge className="bg-amber-500 text-xs h-5">{anniversaries?.upcoming?.length}</Badge>
                      )}
                    </div>
                    {!anniversaries?.upcoming?.length ? (
                      <p className="text-xs text-muted-foreground">None this week</p>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {anniversaries.upcoming.slice(0, 3).map((member) => (
                          <Link
                            key={member.id}
                            to={`/app/members/${member.id}`}
                            className="flex items-center justify-between p-1.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                {member.photo_url ? (
                                  <img src={member.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <CalendarHeart className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                              <span className="text-xs font-medium truncate">{member.full_name}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isToday(parseISO(member.anniversary_date)) && (
                                <Badge className="bg-green-600 text-[10px] h-4 px-1">Today!</Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {member.years} yr{member.years !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Engagement Signals - Clickable */}
        <Link to={`/app/analytics/engagement${branchId ? `?branch=${branchId}` : ""}`}>
          <Card className="hover:scale-[1.02] transition-all cursor-pointer h-full border-0 bg-gradient-to-br from-kpi-rose/5 to-kpi-teal/5">
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
        <Card className="border-0 bg-gradient-to-br from-kpi-amber/5 to-kpi-orange/5">
          <CardHeader className="pb-3"><SectionHeader title="Service Quality" icon={Clock} /></CardHeader>
          <CardContent className="space-y-3">
            <StatCard label="Late Arrival Rate" value={`${serviceQuality?.lateRate || 0}%`} variant="orange" />
            <StatCard label="Early Arrival Rate" value={`${serviceQuality?.earlyRate || 0}%`} variant="green" />
            <StatCard label="Total Check-ins" value={serviceQuality?.totalCheckins || 0} variant="blue" />
          </CardContent>
        </Card>
      </div>

      {/* SECTION 7-8: Groups & Demographics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 bg-gradient-to-br from-kpi-purple/5 to-kpi-blue/5">
          <CardHeader className="pb-3"><SectionHeader title="Groups Snapshot" icon={UsersRound} action={<Link to={buildAnalyticsLink("groups", dateRange, branchId)}><Button variant="ghost" size="sm">View all</Button></Link>} /></CardHeader>
          <CardContent>
            {!groups?.topGroups?.length ? <EmptyState icon={UsersRound} title="No groups" description="Create groups to track ministry engagement" /> : (
              <div className="space-y-2">
                {groups.topGroups.map((g) => <ListItem key={g.id} name={g.name} value={g.members} href={buildAnalyticsLink("groups", dateRange, branchId)} />)}
                <div className="pt-2 text-sm text-muted-foreground">{groups.noGroupPercent}% of attendees have no group assigned</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-kpi-teal/5 to-kpi-green/5">
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

      {/* SECTION 8: Day Born Distribution */}
      <Card className="border-0 bg-gradient-to-br from-kpi-amber/5 to-kpi-orange/5">
        <CardHeader className="pb-3">
          <SectionHeader 
            title="Day Born Distribution" 
            description="Attendees by day of the week they were born"
            icon={Star} 
          />
        </CardHeader>
        <CardContent>
          {dayBornLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : !dayBornData?.some(d => d.count > 0) ? (
            <EmptyState icon={Star} title="No day born data" description="Day born info will appear when members have this field set" />
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayBornData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="label" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    formatter={(value: number) => [`${value} member${value !== 1 ? "s" : ""}`, "Count"]}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={30}
                  >
                    {dayBornData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Leaderboard */}
      <Card className="border-0 bg-gradient-to-br from-kpi-blue/5 to-kpi-purple/5">
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
      <Card className="border-0 bg-gradient-to-br from-kpi-orange/5 to-kpi-amber/5">
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
