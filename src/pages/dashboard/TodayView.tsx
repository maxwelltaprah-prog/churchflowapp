import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  AlertCircle,
  ChevronRight,
  Building2,
  CalendarDays,
  QrCode,
  TrendingUp,
  Phone,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/hooks/useChurchData";
import {
  useTodayKPIs,
  useTodayCheckinTrend,
  useTodayBranchComparison,
  useTodayServices,
  useFollowUpList,
  useLikelyAbsentees,
  useDataQualityFlags
} from "@/hooks/useTodayDashboard";

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  description,
  href,
  isLoading,
  variant = "default"
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  href?: string;
  isLoading?: boolean;
  variant?: "default" | "accent" | "muted";
}) {
  const variantStyles = {
    default: "bg-card border-border",
    accent: "bg-primary/5 border-primary/20",
    muted: "bg-muted/50 border-border"
  };

  const content = (
    <div className={`rounded-xl border p-5 transition-all ${variantStyles[variant]} ${href ? "hover:shadow-card hover:-translate-y-0.5 cursor-pointer" : ""}`}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{value}</span>
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
          {href && (
            <div className="mt-3 flex items-center text-xs text-primary font-medium">
              View details <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

// Empty state component
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-full bg-muted mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

export default function TodayView() {
  const { profile, isChurchAdmin } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);

  // Data hooks
  const { data: branches } = useBranches();
  const { data: todayServices, isLoading: servicesLoading } = useTodayServices(selectedBranchId);
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useTodayKPIs(selectedBranchId, selectedServiceId);
  const { data: checkinTrend, isLoading: trendLoading } = useTodayCheckinTrend(selectedBranchId, selectedServiceId);
  const { data: branchComparison, isLoading: comparisonLoading } = useTodayBranchComparison();
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpList(selectedBranchId);
  const { data: absentees, isLoading: absenteesLoading } = useLikelyAbsentees(selectedBranchId);
  const { data: dataFlags, isLoading: flagsLoading } = useDataQualityFlags(selectedBranchId);

  const today = new Date();
  const showBranchFilter = isChurchAdmin() && branches && branches.length > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Today's View</h1>
          <p className="text-muted-foreground mt-1">
            {format(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          {showBranchFilter && (
            <Select value={selectedBranchId || "all"} onValueChange={(v) => setSelectedBranchId(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Service Filter */}
          <Select 
            value={selectedServiceId || "all"} 
            onValueChange={(v) => setSelectedServiceId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[200px]">
              <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services Today</SelectItem>
              {servicesLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : todayServices?.length === 0 ? (
                <SelectItem value="none" disabled>No services today</SelectItem>
              ) : (
                todayServices?.map((service: any) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} {service.start_time && `(${service.start_time.slice(0, 5)})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Actions */}
          <Button variant="outline" size="icon" onClick={() => refetchKPIs()} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Link to="/app/checkin">
            <Button>
              <QrCode className="w-4 h-4 mr-2" />
              Start Check-in
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Attendance"
          value={kpis?.totalAttendance ?? 0}
          icon={Users}
          href="/app/analytics"
          isLoading={kpisLoading}
        />
        <KPICard
          title="Visitors Today"
          value={kpis?.visitorsToday ?? 0}
          icon={UserPlus}
          href="/app/members?status=visitor"
          isLoading={kpisLoading}
          variant="accent"
        />
        <KPICard
          title="First-Timers"
          value={kpis?.firstTimersToday ?? 0}
          icon={UserCheck}
          href="/app/members?status=first_timer"
          isLoading={kpisLoading}
          variant="accent"
        />
        <KPICard
          title="Returning Visitors"
          value={kpis?.returningVisitorsToday ?? 0}
          icon={RefreshCw}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Late Arrivals"
          value={kpis?.lateArrivals ?? 0}
          icon={Clock}
          description=">30 min"
          isLoading={kpisLoading}
          variant="muted"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Check-in Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Check-in Flow
            </CardTitle>
            <CardDescription>Hourly check-in pattern today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {trendLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : checkinTrend?.every(d => d.checkins === 0) ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No check-ins yet"
                  description="Check-in data will appear here as members arrive"
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={checkinTrend}>
                    <defs>
                      <linearGradient id="checkinGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="time" 
                      className="text-xs" 
                      tickFormatter={(v) => v.replace(":00", "")}
                      interval={2}
                    />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "8px" 
                      }}
                      formatter={(value: number) => [value, "Check-ins"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="checkins" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      fill="url(#checkinGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Branch Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              Branch Comparison
            </CardTitle>
            <CardDescription>Today's attendance by branch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {comparisonLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : !branchComparison?.length ? (
                <EmptyState
                  icon={Building2}
                  title="No branch data"
                  description="Branch attendance will appear here"
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" className="text-xs" allowDecimals={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      className="text-xs" 
                      width={80}
                      tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + "..." : v}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "8px" 
                      }}
                      formatter={(value: number, name: string) => [
                        value, 
                        name === "attendance" ? "Attendance" : "Attendance Rate %"
                      ]}
                    />
                    <Bar 
                      dataKey="attendance" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    >
                      {branchComparison.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isMain ? "hsl(var(--accent))" : "hsl(var(--primary))"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Follow-ups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-accent" />
              New People to Follow Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUpsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !followUps?.length ? (
              <EmptyState
                icon={UserPlus}
                title="No new visitors"
                description="First-timers and visitors will appear here"
              />
            ) : (
              <div className="space-y-2">
                {followUps.map((person: any) => (
                  <div 
                    key={person.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{person.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {person.status?.replace("_", " ")}
                        </Badge>
                        {person.branch && (
                          <span className="text-xs text-muted-foreground truncate">{person.branch}</span>
                        )}
                      </div>
                    </div>
                    {person.phone && (
                      <a href={`tel:${person.phone}`} className="p-2 hover:bg-background rounded-md">
                        <Phone className="w-4 h-4 text-primary" />
                      </a>
                    )}
                  </div>
                ))}
                {followUps.length >= 10 && (
                  <Link to="/app/members?status=visitor">
                    <Button variant="ghost" className="w-full mt-2 text-sm">
                      View all <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Likely Absentees */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Likely Absent Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absenteesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !absentees?.length ? (
              <EmptyState
                icon={Users}
                title="All regulars present"
                description="Or not enough historical data yet"
              />
            ) : (
              <div className="space-y-2">
                {absentees.map((person: any) => (
                  <div 
                    key={person.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{person.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Usually attends {person.usualAttendance}x/month
                        </span>
                      </div>
                    </div>
                    {person.phone && (
                      <a href={`tel:${person.phone}`} className="p-2 hover:bg-background rounded-md">
                        <Phone className="w-4 h-4 text-primary" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Quality Flags */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flagsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !dataFlags?.length ? (
              <EmptyState
                icon={UserCheck}
                title="All clear"
                description="No data quality issues found"
              />
            ) : (
              <div className="space-y-2">
                {dataFlags.map((flag, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      flag.type === "warning" 
                        ? "bg-destructive/5 border-destructive/20" 
                        : "bg-amber-500/5 border-amber-500/20"
                    }`}
                  >
                    <p className="font-medium text-sm text-foreground">{flag.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                  </div>
                ))}
                <Link to="/app/members?approval=pending">
                  <Button variant="ghost" className="w-full mt-2 text-sm">
                    Review members <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
