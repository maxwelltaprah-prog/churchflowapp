import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  UserMinus,
  Download,
  Phone,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface AbsenteeMember {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  membership_status: string | null;
  branch_id: string;
  branch_name?: string;
  last_seen?: string | null;
  groups?: string[];
}

// =================== Group Absentees Hook ===================
function useGroupAbsentees(groupId: string | null) {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();
  const { data: branches } = useBranches();

  return useQuery({
    queryKey: ["group-absentees", profile?.church_id, groupId, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id || !groupId) return { absentees: [], groupName: "", totalMembers: 0, attendedCount: 0 };

      // Fetch group info
      const { data: groupData } = await supabase
        .from("groups")
        .select("id, name")
        .eq("id", groupId)
        .single();

      if (!groupData) return { absentees: [], groupName: "", totalMembers: 0, attendedCount: 0 };

      // Fetch all members in this group
      const { data: memberGroupData } = await supabase
        .from("member_groups")
        .select("member_id")
        .eq("group_id", groupId);

      const groupMemberIds = (memberGroupData || []).map(mg => mg.member_id);
      
      if (groupMemberIds.length === 0) {
        return { absentees: [], groupName: groupData.name, totalMembers: 0, attendedCount: 0 };
      }

      // Fetch member details with branch filtering
      let membersQuery = supabase
        .from("members")
        .select("id, full_name, phone, email, membership_status, branch_id, is_active")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .in("id", groupMemberIds);

      membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: members } = await membersQuery;
      const filteredMemberIds = (members || []).map(m => m.id);

      if (filteredMemberIds.length === 0) {
        return { absentees: [], groupName: groupData.name, totalMembers: 0, attendedCount: 0 };
      }

      // Fetch attendance for these members in the time window
      let attendanceQuery = supabase
        .from("attendance")
        .select("member_id, checked_in_at")
        .eq("church_id", profile.church_id)
        .in("member_id", filteredMemberIds)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;
      const attendedMemberIds = new Set((attendance || []).map(a => a.member_id));

      // Fetch last seen date for each member (overall, not just in window)
      const { data: allAttendance } = await supabase
        .from("attendance")
        .select("member_id, checked_in_at")
        .eq("church_id", profile.church_id)
        .in("member_id", filteredMemberIds)
        .order("checked_in_at", { ascending: false });

      const lastSeenMap: Record<string, string> = {};
      (allAttendance || []).forEach(a => {
        if (!lastSeenMap[a.member_id]) {
          lastSeenMap[a.member_id] = a.checked_in_at;
        }
      });

      // Fetch all member groups for displaying group memberships
      const { data: allMemberGroups } = await supabase
        .from("member_groups")
        .select("member_id, groups(name)")
        .in("member_id", filteredMemberIds);

      const memberGroupsMap: Record<string, string[]> = {};
      (allMemberGroups || []).forEach((mg: any) => {
        if (!memberGroupsMap[mg.member_id]) {
          memberGroupsMap[mg.member_id] = [];
        }
        if (mg.groups?.name) {
          memberGroupsMap[mg.member_id].push(mg.groups.name);
        }
      });

      // Build branch map
      const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

      // Filter to only absentees (members with zero attendance in window)
      const absentees: AbsenteeMember[] = (members || [])
        .filter(m => !attendedMemberIds.has(m.id))
        .map(m => ({
          id: m.id,
          full_name: m.full_name,
          phone: m.phone,
          email: m.email,
          membership_status: m.membership_status,
          branch_id: m.branch_id,
          branch_name: branchMap.get(m.branch_id) || "Unknown",
          last_seen: lastSeenMap[m.id] || null,
          groups: memberGroupsMap[m.id] || [],
        }));

      return {
        absentees,
        groupName: groupData.name,
        totalMembers: filteredMemberIds.length,
        attendedCount: attendedMemberIds.size,
      };
    },
    enabled: !!profile?.church_id && !!groupId,
  });
}

// =================== Export Functions ===================
function exportToCSV(members: AbsenteeMember[], groupName: string) {
  const headers = ["Name", "Phone", "Email", "Status", "Branch", "Last Seen", "Groups"];
  const rows = members.map(m => [
    m.full_name,
    m.phone || "",
    m.email || "",
    m.membership_status || "",
    m.branch_name || "",
    m.last_seen ? format(parseISO(m.last_seen), "yyyy-MM-dd") : "Never",
    (m.groups || []).join("; "),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${groupName.replace(/\s+/g, "_")}_absentees_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  toast.success("CSV exported successfully");
}

// =================== Main Component ===================
export default function GroupAbsenteesPage() {
  const [searchParams] = useSearchParams();
  const { filters, buildAnalyticsUrl } = useAnalyticsFilters();
  const { data: branches } = useBranches();

  const groupId = searchParams.get("group_id");
  const { data, isLoading } = useGroupAbsentees(groupId);
  const periodLabel = formatDateRangeLabel(filters);

  // Get branch name for display
  const branchName = useMemo(() => {
    if (!filters.branchId) return "All Branches";
    const branch = branches?.find(b => b.id === filters.branchId);
    return branch?.name || "Selected Branch";
  }, [filters.branchId, branches]);

  const handleBroadcast = () => {
    if (!data?.absentees?.length) return;
    // This would navigate to broadcasts page with pre-selected audience
    toast.info("Broadcast feature coming soon!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/app/analytics/groups" className="hover:text-foreground transition-colors">Groups</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Absentees</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <UserMinus className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {data?.groupName || "Group"} — Absentees
            </h1>
            <p className="text-muted-foreground">
              Members who didn't attend during {periodLabel.toLowerCase()} • {branchName}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar showServiceFilter={false} />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-3xl font-bold mt-1">{data?.totalMembers || 0}</p>
                <p className="text-xs text-muted-foreground">in this group</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attended</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{data?.attendedCount || 0}</p>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{data?.absentees?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-3xl font-bold mt-1">
                  {data?.totalMembers && data.totalMembers > 0
                    ? Math.round((data.attendedCount / data.totalMembers) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-600" />
              <span className="font-medium">{data?.absentees?.length || 0} absentee{(data?.absentees?.length || 0) !== 1 ? "s" : ""}</span>
              <span className="text-muted-foreground">in {data?.groupName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => data?.absentees && exportToCSV(data.absentees, data.groupName)}
                disabled={!data?.absentees?.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleBroadcast}
                disabled={!data?.absentees?.length}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Broadcast Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Absentees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Absentee Members</CardTitle>
          <CardDescription>
            Group members with zero attendance in the selected time window
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !data?.absentees?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserMinus className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No absentees found!</p>
              <p className="text-sm">All group members attended during this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.absentees.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>{member.phone || "—"}</TableCell>
                      <TableCell>{member.branch_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.membership_status?.replace("_", " ") || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.last_seen ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(parseISO(member.last_seen), "MMM d, yyyy")}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.groups?.slice(0, 2).map((g, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {g}
                            </Badge>
                          ))}
                          {(member.groups?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(member.groups?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.phone && (
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <a href={`tel:${member.phone}`}>
                              <Phone className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
