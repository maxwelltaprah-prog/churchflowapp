import { useMemo, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  Users,
  UserPlus,
  TrendingUp,
  Activity,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { format, eachWeekOfInterval, eachMonthOfInterval, differenceInDays, endOfWeek, endOfMonth } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(200 80% 50%)",
  "hsl(340 75% 55%)",
  "hsl(170 70% 40%)",
];

// =================== Groups Analytics Hook ===================
function useGroupsAnalytics() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["groups-analytics", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Fetch all groups
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, is_active")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("sort_order");

      if (!groups?.length) {
        return {
          groups: [],
          groupAttendance: [],
          totalAttendees: 0,
          groupedAttendees: 0,
          participationRate: 0,
          groupGrowth: [],
        };
      }

      // Fetch member-group assignments
      const { data: memberGroups } = await supabase
        .from("member_groups")
        .select("member_id, group_id, joined_at");

      // Build member to groups mapping
      const memberToGroups: Record<string, string[]> = {};
      (memberGroups || []).forEach(mg => {
        if (!memberToGroups[mg.member_id]) {
          memberToGroups[mg.member_id] = [];
        }
        memberToGroups[mg.member_id].push(mg.group_id);
      });

      // Fetch attendance in date range
      let attendanceQuery = supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;
      const uniqueAttendeeIds = [...new Set((attendance || []).map(a => a.member_id))];

      // Calculate attendance by group
      const groupCounts: Record<string, { count: number; members: string[] }> = {};
      groups.forEach(g => { groupCounts[g.id] = { count: 0, members: [] }; });

      let groupedAttendees = 0;
      uniqueAttendeeIds.forEach(memberId => {
        const memberGroupIds = memberToGroups[memberId] || [];
        if (memberGroupIds.length > 0) {
          groupedAttendees++;
          memberGroupIds.forEach(gid => {
            if (groupCounts[gid]) {
              groupCounts[gid].count++;
              groupCounts[gid].members.push(memberId);
            }
          });
        }
      });

      const groupAttendance = groups.map(g => ({
        id: g.id,
        name: g.name,
        attendance: groupCounts[g.id]?.count || 0,
        members: groupCounts[g.id]?.members || [],
      })).sort((a, b) => b.attendance - a.attendance);

      const participationRate = uniqueAttendeeIds.length > 0
        ? Math.round((groupedAttendees / uniqueAttendeeIds.length) * 100)
        : 0;

      // Group growth over time
      const daysDiff = differenceInDays(filters.endDate, filters.startDate);
      let intervals: { start: Date; end: Date; label: string }[];

      if (daysDiff <= 60) {
        intervals = eachWeekOfInterval({ start: filters.startDate, end: filters.endDate }).map(d => ({
          start: d,
          end: endOfWeek(d),
          label: format(d, "'W'w"),
        }));
      } else {
        intervals = eachMonthOfInterval({ start: filters.startDate, end: filters.endDate }).map(d => ({
          start: d,
          end: endOfMonth(d),
          label: format(d, "MMM"),
        }));
      }

      const groupGrowth = intervals.map(interval => {
        const newJoins = (memberGroups || []).filter(mg => {
          const joinedAt = new Date(mg.joined_at);
          return joinedAt >= interval.start && joinedAt <= interval.end;
        }).length;

        return {
          period: interval.label,
          newJoins,
        };
      });

      return {
        groups,
        groupAttendance,
        totalAttendees: uniqueAttendeeIds.length,
        groupedAttendees,
        participationRate,
        groupGrowth,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Member List Modal ===================
interface MemberListModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  memberIds: string[];
  filterContext: string;
}

function MemberListModal({ open, onClose, title, memberIds, filterContext }: MemberListModalProps) {
  const { profile } = useAuth();

  const { data: members, isLoading } = useQuery({
    queryKey: ["group-members-detail", memberIds],
    queryFn: async () => {
      if (!memberIds.length) return [];
      const { data } = await supabase
        .from("members")
        .select("id, full_name, phone, membership_status")
        .in("id", memberIds);
      return data || [];
    },
    enabled: open && memberIds.length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {memberIds.length} member{memberIds.length !== 1 ? "s" : ""} • {filterContext}
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.membership_status || "—"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!members || members.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No members found
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
export default function GroupsAnalyticsPage() {
  const { filters } = useAnalyticsFilters();
  const { data: analytics, isLoading } = useGroupsAnalytics();
  const periodLabel = formatDateRangeLabel(filters);

  const [modalState, setModalState] = useState<{
    open: boolean;
    title: string;
    memberIds: string[];
  }>({
    open: false,
    title: "",
    memberIds: [],
  });

  const handleGroupClick = (groupName: string, memberIds: string[]) => {
    setModalState({
      open: true,
      title: groupName,
      memberIds,
    });
  };

  // Pie chart data for participation
  const participationData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: "In Groups", value: analytics.groupedAttendees, color: CHART_COLORS[0] },
      { name: "No Group", value: analytics.totalAttendees - analytics.groupedAttendees, color: CHART_COLORS[1] },
    ].filter(d => d.value > 0);
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Groups & Ministries</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Groups & Ministries</h1>
        <p className="text-muted-foreground">
          Analyze group participation and engagement for {periodLabel.toLowerCase()}
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar showServiceFilter={false} />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Groups</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.groups?.length || 0}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
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
                  <p className="text-sm font-medium text-muted-foreground">Total Attendees</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.totalAttendees || 0}</p>
                  <p className="text-xs text-muted-foreground">{periodLabel}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
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
                  <p className="text-sm font-medium text-muted-foreground">In Groups</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.groupedAttendees || 0}</p>
                  <p className="text-xs text-muted-foreground">Linked to ministry</p>
                </div>
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <UserPlus className="h-5 w-5 text-green-600" />
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
                  <p className="text-sm font-medium text-muted-foreground">Participation Rate</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.participationRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Attendees in groups</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance by Group */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Attendance by Group
            </CardTitle>
            <CardDescription>Ranked by attendee count</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics?.groupAttendance?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.groupAttendance.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="attendance"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    onClick={(entry) => handleGroupClick(entry.name, entry.members)}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Layers className="w-12 h-12 mb-3 opacity-20" />
                <p>No group data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-accent" />
              Participation Breakdown
            </CardTitle>
            <CardDescription>Attendees linked to groups vs unlinked</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : participationData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={participationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {participationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, "Members"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-2">
                  {participationData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}: <strong>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p>No attendance data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Group Membership Growth
          </CardTitle>
          <CardDescription>New group joins over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : analytics?.groupGrowth?.some(g => g.newJoins > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics.groupGrowth}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newJoins"
                  name="New Joins"
                  stroke="hsl(142 76% 36%)"
                  fill="url(#growthGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
              <p>No group joins in this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Groups</CardTitle>
          <CardDescription>Click a row to view members</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Group Name</TableHead>
                  <TableHead className="text-right">Attendees</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.groupAttendance?.map((group, idx) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleGroupClick(group.name, group.members)}
                  >
                    <TableCell>
                      <Badge variant={idx < 3 ? "default" : "outline"}>#{idx + 1}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-right">{group.attendance}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {analytics.totalAttendees > 0
                        ? Math.round((group.attendance / analytics.totalAttendees) * 100)
                        : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {(!analytics?.groupAttendance || analytics.groupAttendance.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No groups found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Member List Modal */}
      <MemberListModal
        open={modalState.open}
        onClose={() => setModalState(prev => ({ ...prev, open: false }))}
        title={modalState.title}
        memberIds={modalState.memberIds}
        filterContext={periodLabel}
      />
    </div>
  );
}
