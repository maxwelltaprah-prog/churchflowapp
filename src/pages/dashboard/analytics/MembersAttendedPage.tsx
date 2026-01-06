import { useMemo } from "react";
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
import { UserCheck, Download, Phone, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import { format, parseISO } from "date-fns";

interface MemberAttended {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  membership_status: string | null;
  branch_id: string;
  branch_name?: string;
  checkin_count: number;
  last_checkin: string;
}

function useMembersAttended(serviceIds: string[], branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { data: branches } = useBranches();

  return useQuery({
    queryKey: ["members-attended", profile?.church_id, serviceIds, branchId, accessibleBranchIds],
    queryFn: async (): Promise<{ members: MemberAttended[]; total: number }> => {
      if (!profile?.church_id || serviceIds.length === 0) {
        return { members: [], total: 0 };
      }

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { members: [], total: 0 };
      }

      // Get attendance for selected services
      let query = supabase
        .from("attendance")
        .select("member_id, checked_in_at, members!inner(id, full_name, phone, email, membership_status, branch_id)")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data, error } = await query;
      if (error) throw error;

      // Deduplicate by member and count check-ins
      const memberMap: Record<string, MemberAttended> = {};
      (data || []).forEach(a => {
        const member = a.members as any;
        if (!memberMap[member.id]) {
          memberMap[member.id] = {
            id: member.id,
            full_name: member.full_name,
            phone: member.phone,
            email: member.email,
            membership_status: member.membership_status,
            branch_id: member.branch_id,
            checkin_count: 0,
            last_checkin: a.checked_in_at,
          };
        }
        memberMap[member.id].checkin_count++;
        if (a.checked_in_at > memberMap[member.id].last_checkin) {
          memberMap[member.id].last_checkin = a.checked_in_at;
        }
      });

      // Add branch names
      const branchMap = new Map((branches || []).map(b => [b.id, b.name]));
      const results = Object.values(memberMap).map(m => ({
        ...m,
        branch_name: branchMap.get(m.branch_id) || "Unknown",
      }));

      // Sort by check-in count descending
      results.sort((a, b) => b.checkin_count - a.checkin_count);

      return { members: results, total: results.length };
    },
    enabled: !!profile?.church_id && !accessLoading && serviceIds.length > 0,
  });
}

function exportToCSV(members: MemberAttended[]) {
  const headers = ["Name", "Phone", "Email", "Status", "Branch", "Check-ins", "Last Check-in"];
  const rows = members.map(m => [
    m.full_name,
    m.phone || "",
    m.email || "",
    m.membership_status || "",
    m.branch_name || "",
    m.checkin_count.toString(),
    m.last_checkin ? format(parseISO(m.last_checkin), "yyyy-MM-dd HH:mm") : "",
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `members-attended-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MembersAttendedPage() {
  const [searchParams] = useSearchParams();
  const { data: branches } = useBranches();

  // Get filters from URL
  const serviceIdsParam = searchParams.get("services");
  const serviceIds = serviceIdsParam ? serviceIdsParam.split(",") : [];
  const branchId = searchParams.get("branch") || undefined;

  const { data, isLoading } = useMembersAttended(serviceIds, branchId);

  // Get branch name for display
  const branchName = useMemo(() => {
    if (!branchId) return "All Branches";
    const branch = branches?.find(b => b.id === branchId);
    return branch?.name || "Selected Branch";
  }, [branchId, branches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Members Attended"
        description={`Unique members who checked in • ${branchName}`}
        icon={UserCheck}
        backTo="/app/analytics/attendance"
      />

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unique Members</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold">{data?.total?.toLocaleString() || 0}</p>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => data?.members && exportToCSV(data.members)}
              disabled={!data?.members?.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Member List</CardTitle>
          <CardDescription>
            Showing {data?.members?.length || 0} members who checked in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !data?.members?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No members found</p>
              <p className="text-sm">No check-ins for the selected services</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Check-ins</TableHead>
                    <TableHead>Last Check-in</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link 
                          to={`/app/members/${member.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {member.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {member.phone ? (
                          <a 
                            href={`tel:${member.phone}`} 
                            className="flex items-center gap-1 text-sm hover:text-primary"
                          >
                            <Phone className="w-3 h-3" />
                            {member.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          member.membership_status === "active" ? "default" :
                          member.membership_status === "inactive" ? "secondary" :
                          "outline"
                        }>
                          {member.membership_status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {member.branch_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">
                          {member.checkin_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(member.last_checkin), "MMM d, h:mm a")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link to={`/app/members/${member.id}`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
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
