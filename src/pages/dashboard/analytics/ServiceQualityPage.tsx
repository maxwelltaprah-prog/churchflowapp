import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  Clock,
  Activity,
  AlertTriangle,
  
  CheckCircle2,
  XCircle,
  Users,
  BarChart3,
  Gauge,
} from "lucide-react";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, getHours, getMinutes } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

// =================== Service Quality Hook ===================
function useServiceQualityMetrics() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["service-quality", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Fetch attendance with timestamps
      let attendanceQuery = supabase
        .from("attendance")
        .select("id, checked_in_at, member_id, branch_id, checkin_method")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;
      const checkins = attendance || [];

      // Peak check-in time analysis (by hour buckets)
      const hourBuckets: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourBuckets[i] = 0;

      checkins.forEach(c => {
        const hour = getHours(parseISO(c.checked_in_at));
        hourBuckets[hour]++;
      });

      // Find peak hour
      let peakHour = 0;
      let peakCount = 0;
      Object.entries(hourBuckets).forEach(([hour, count]) => {
        if (count > peakCount) {
          peakHour = parseInt(hour);
          peakCount = count;
        }
      });

      // Throughput by 30-min buckets for peak visualization
      const thirtyMinBuckets: Record<string, number> = {};
      checkins.forEach(c => {
        const dt = parseISO(c.checked_in_at);
        const hour = getHours(dt);
        const halfHour = getMinutes(dt) < 30 ? "00" : "30";
        const key = `${hour.toString().padStart(2, "0")}:${halfHour}`;
        thirtyMinBuckets[key] = (thirtyMinBuckets[key] || 0) + 1;
      });

      const throughputData = Object.entries(thirtyMinBuckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, count]) => ({ time, checkins: count }));

      // Check-in method breakdown
      const methodCounts: Record<string, number> = { staff_scan: 0, self_scan: 0 };
      checkins.forEach(c => {
        const method = c.checkin_method || "staff_scan";
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      // Fetch members for data completeness
      let membersQuery = supabase
        .from("members")
        .select("id, gender, date_of_birth")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved");

      membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: members } = await membersQuery;
      const allMembers = members || [];

      // Fetch member_groups for group completeness
      const memberIds = allMembers.map(m => m.id);
      let memberGroupsCount = 0;
      if (memberIds.length > 0) {
        const { count } = await supabase
          .from("member_groups")
          .select("member_id", { count: "exact", head: true })
          .in("member_id", memberIds);
        
        // Get unique members with groups
        const { data: memberGroups } = await supabase
          .from("member_groups")
          .select("member_id")
          .in("member_id", memberIds);
        
        const uniqueMembersWithGroups = new Set((memberGroups || []).map(mg => mg.member_id));
        memberGroupsCount = uniqueMembersWithGroups.size;
      }

      // Data completeness
      const totalMembers = allMembers.length;
      const withGender = allMembers.filter(m => m.gender).length;
      const withDOB = allMembers.filter(m => m.date_of_birth).length;
      const withGroup = memberGroupsCount;

      const completeness = {
        total: totalMembers,
        gender: { count: withGender, percent: totalMembers > 0 ? Math.round((withGender / totalMembers) * 100) : 0 },
        dob: { count: withDOB, percent: totalMembers > 0 ? Math.round((withDOB / totalMembers) * 100) : 0 },
        group: { count: withGroup, percent: totalMembers > 0 ? Math.round((withGroup / totalMembers) * 100) : 0 },
        overall: totalMembers > 0 
          ? Math.round(((withGender + withDOB + withGroup) / (totalMembers * 3)) * 100)
          : 0,
        missingGender: totalMembers - withGender,
        missingDOB: totalMembers - withDOB,
        missingGroup: totalMembers - withGroup,
      };

      return {
        totalCheckins: checkins.length,
        peakHour,
        peakCount,
        peakTimeLabel: `${peakHour.toString().padStart(2, "0")}:00 - ${(peakHour + 1).toString().padStart(2, "0")}:00`,
        throughputData,
        checkinMethods: methodCounts,
        completeness,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Incomplete Members Modal ===================
interface IncompleteMembersModalProps {
  open: boolean;
  onClose: () => void;
  field: "gender" | "dob" | "group";
  filterContext: string;
}

function IncompleteMembersModal({ open, onClose, field, filterContext }: IncompleteMembersModalProps) {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  const { data: members, isLoading } = useQuery({
    queryKey: ["incomplete-members", profile?.church_id, filters.branchId, field, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("members")
        .select("id, full_name, phone, gender, date_of_birth")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved");

      query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      if (field === "gender") {
        query = query.is("gender", null);
      } else if (field === "dob") {
        query = query.is("date_of_birth", null);
      }

      const { data } = await query;

      if (field === "group" && data?.length) {
        // Filter to members not in any group
        const memberIds = data.map(m => m.id);
        const { data: memberGroups } = await supabase
          .from("member_groups")
          .select("member_id")
          .in("member_id", memberIds);
        
        const membersWithGroups = new Set((memberGroups || []).map(mg => mg.member_id));
        return data.filter(m => !membersWithGroups.has(m.id));
      }

      return data || [];
    },
    enabled: open && !!profile?.church_id,
  });

  const fieldLabels = {
    gender: "Missing Gender",
    dob: "Missing Date of Birth",
    group: "Not in Any Group",
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {fieldLabels[field]}
          </DialogTitle>
          <DialogDescription>
            {members?.length || 0} member{(members?.length || 0) !== 1 ? "s" : ""} • {filterContext}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>DOB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.phone || "—"}</TableCell>
                    <TableCell>
                      {member.gender ? (
                        <Badge variant="outline">{member.gender}</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.date_of_birth ? (
                        format(parseISO(member.date_of_birth), "MMM d, yyyy")
                      ) : (
                        <Badge variant="destructive" className="text-xs">Missing</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!members || members.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      All members have this field completed
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =================== Main Component ===================
export default function ServiceQualityPage() {
  const { filters } = useAnalyticsFilters();
  const { data: metrics, isLoading } = useServiceQualityMetrics();
  const periodLabel = formatDateRangeLabel(filters);

  const [modalState, setModalState] = useState<{
    open: boolean;
    field: "gender" | "dob" | "group";
  }>({
    open: false,
    field: "gender",
  });

  const handleCompletenessClick = (field: "gender" | "dob" | "group") => {
    setModalState({ open: true, field });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Service Quality</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Service Quality Indicators</h1>
        <p className="text-muted-foreground">
          Operational performance metrics for {periodLabel.toLowerCase()}
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar showServiceFilter={true} />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
                  <p className="text-3xl font-bold mt-1">{metrics?.totalCheckins || 0}</p>
                  <p className="text-xs text-muted-foreground">{periodLabel}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                  <p className="text-2xl font-bold mt-1">{metrics?.peakTimeLabel || "—"}</p>
                  <p className="text-xs text-muted-foreground">{metrics?.peakCount || 0} check-ins</p>
                </div>
                <div className="p-2.5 rounded-xl bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Completeness</p>
                  <p className="text-3xl font-bold mt-1">{metrics?.completeness?.overall || 0}%</p>
                  <p className="text-xs text-muted-foreground">Member profiles</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <Gauge className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Check-in Throughput */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Check-in Throughput
            </CardTitle>
            <CardDescription>Check-ins by 30-minute window</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : metrics?.throughputData?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.throughputData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={1} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="checkins" name="Check-ins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No check-in data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Completeness Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-600" />
              Data Completeness
            </CardTitle>
            <CardDescription>Click each row to view members with missing data</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : metrics?.completeness ? (
              <div className="space-y-6">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Members Analyzed</p>
                  <p className="text-3xl font-bold">{metrics.completeness.total}</p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => handleCompletenessClick("gender")}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Gender</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{metrics.completeness.gender.percent}%</span>
                        {metrics.completeness.missingGender > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {metrics.completeness.missingGender} missing
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={metrics.completeness.gender.percent} className="h-2" />
                  </button>

                  <button
                    onClick={() => handleCompletenessClick("dob")}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Date of Birth</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{metrics.completeness.dob.percent}%</span>
                        {metrics.completeness.missingDOB > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {metrics.completeness.missingDOB} missing
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={metrics.completeness.dob.percent} className="h-2" />
                  </button>

                  <button
                    onClick={() => handleCompletenessClick("group")}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Group Assignment</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{metrics.completeness.group.percent}%</span>
                        {metrics.completeness.missingGroup > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {metrics.completeness.missingGroup} unassigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={metrics.completeness.group.percent} className="h-2" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                <Gauge className="w-12 h-12 mb-3 opacity-20" />
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check-in Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Check-in Methods
          </CardTitle>
          <CardDescription>How members are checking in</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : metrics?.checkinMethods ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Staff Scan</p>
                    <p className="text-xs text-muted-foreground">Admin/usher scanned member</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{metrics.checkinMethods.staff_scan || 0}</p>
              </div>

              <div className="p-4 rounded-lg border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Self Check-in</p>
                    <p className="text-xs text-muted-foreground">Member checked themselves in</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{metrics.checkinMethods.self_scan || 0}</p>
              </div>

              {metrics.totalCheckins > 0 && (
                <div className="md:col-span-2 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Self-service adoption</span>
                    <span className="font-medium text-foreground">
                      {Math.round(((metrics.checkinMethods.self_scan || 0) / metrics.totalCheckins) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>No check-in data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incomplete Members Modal */}
      <IncompleteMembersModal
        open={modalState.open}
        onClose={() => setModalState(prev => ({ ...prev, open: false }))}
        field={modalState.field}
        filterContext={periodLabel}
      />
    </div>
  );
}
