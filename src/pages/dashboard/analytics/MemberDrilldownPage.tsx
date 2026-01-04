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
import {
  ChevronRight,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  RefreshCw,
  Clock,
  Download,
  Phone,
} from "lucide-react";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import { format, parseISO, subWeeks, differenceInYears } from "date-fns";

// Segment definitions
export type MemberSegment = 
  | "all" 
  | "visitors" 
  | "first_timers" 
  | "members" 
  | "absentees" 
  | "at_risk" 
  | "returning_visitors"
  | "cross_branch";

const SEGMENT_CONFIG: Record<MemberSegment, { 
  label: string; 
  description: string; 
  icon: React.ElementType;
  variant: "default" | "accent" | "success" | "warning" | "destructive";
}> = {
  all: { label: "All Attendees", description: "Everyone who checked in", icon: Users, variant: "default" },
  visitors: { label: "Visitors", description: "Members with visitor status", icon: UserPlus, variant: "accent" },
  first_timers: { label: "First-Timers", description: "First time at church", icon: UserCheck, variant: "accent" },
  members: { label: "Members", description: "Full church members", icon: Users, variant: "success" },
  absentees: { label: "Absentees", description: "Missed 3+ consecutive service days", icon: UserMinus, variant: "destructive" },
  at_risk: { label: "At Risk", description: "4-8 weeks without attendance", icon: Clock, variant: "warning" },
  returning_visitors: { label: "Returning Visitors", description: "Visitors who came back", icon: RefreshCw, variant: "accent" },
  cross_branch: { label: "Cross-Branch", description: "Checked in at different branch", icon: Users, variant: "default" },
};

// =================== Segmented Members Hook ===================
interface MemberResult {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  membership_status: string | null;
  gender: string | null;
  date_of_birth: string | null;
  branch_id: string;
  created_at: string;
  last_checkin?: string;
  checkin_count?: number;
}

function useSegmentedMembers(segment: MemberSegment) {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();
  const { data: branches } = useBranches();

  return useQuery({
    queryKey: ["segmented-members", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), segment, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { members: [], total: 0 };

      let results: MemberResult[] = [];

      if (segment === "absentees") {
        // Absentees: members who missed 3+ consecutive service days
        // Get all service dates (grouped by day)
        let servicesQuery = supabase
          .from("services")
          .select("id, service_date")
          .eq("church_id", profile.church_id)
          .eq("is_active", true)
          .order("service_date", { ascending: false });

        servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: servicesData } = await servicesQuery;
        
        // Group services by date (multiple services on same day count as one)
        const uniqueServiceDates = [...new Set((servicesData || []).map(s => s.service_date))];
        const lastThreeServiceDays = uniqueServiceDates.slice(0, 3);

        if (lastThreeServiceDays.length < 3) {
          return { members: [], total: 0 };
        }

        // Get all active members
        let membersQuery = supabase
          .from("members")
          .select("id, full_name, phone, email, membership_status, gender, date_of_birth, branch_id, created_at")
          .eq("church_id", profile.church_id)
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .eq("membership_status", "member");

        membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: allMembers } = await membersQuery;
        const memberIds = (allMembers || []).map(m => m.id);

        if (memberIds.length === 0) return { members: [], total: 0 };

        // Get services on the last 3 service days
        const serviceIdsOnLastThreeDays = (servicesData || [])
          .filter(s => lastThreeServiceDays.includes(s.service_date))
          .map(s => s.id);

        // Get attendance for these services
        let recentAttendanceQuery = supabase
          .from("attendance")
          .select("member_id, checked_in_at, service_id, services!inner(service_date)")
          .eq("church_id", profile.church_id)
          .in("service_id", serviceIdsOnLastThreeDays);

        recentAttendanceQuery = applyBranchFilter(recentAttendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: recentAttendance } = await recentAttendanceQuery;

        // For each member, track which service days they attended
        const memberAttendanceDays = new Map<string, Set<string>>();
        memberIds.forEach(id => memberAttendanceDays.set(id, new Set()));

        (recentAttendance || []).forEach(a => {
          const serviceDate = (a.services as any)?.service_date;
          if (serviceDate && memberAttendanceDays.has(a.member_id)) {
            memberAttendanceDays.get(a.member_id)!.add(serviceDate);
          }
        });

        // Get last attendance for context
        let allAttendanceQuery = supabase
          .from("attendance")
          .select("member_id, checked_in_at")
          .eq("church_id", profile.church_id)
          .in("member_id", memberIds)
          .order("checked_in_at", { ascending: false });

        allAttendanceQuery = applyBranchFilter(allAttendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: allAttendance } = await allAttendanceQuery;
        
        const lastCheckinMap: Record<string, string> = {};
        (allAttendance || []).forEach(a => {
          if (!lastCheckinMap[a.member_id]) {
            lastCheckinMap[a.member_id] = a.checked_in_at;
          }
        });

        // Filter to members who attended NONE of the last 3 service days
        results = (allMembers || [])
          .filter(m => {
            const daysAttended = memberAttendanceDays.get(m.id);
            return daysAttended && daysAttended.size === 0;
          })
          .map(m => ({
            ...m,
            last_checkin: lastCheckinMap[m.id],
          }));

      } else if (segment === "at_risk") {
        // At risk: last attendance was 4-8 weeks ago
        const cutoffEnd = subWeeks(new Date(), 4);
        const cutoffStart = subWeeks(new Date(), 8);

        // Get all active members
        let membersQuery = supabase
          .from("members")
          .select("id, full_name, phone, email, membership_status, gender, date_of_birth, branch_id, created_at")
          .eq("church_id", profile.church_id)
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .eq("membership_status", "member");

        membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: allMembers } = await membersQuery;
        const memberIds = (allMembers || []).map(m => m.id);

        if (memberIds.length === 0) return { members: [], total: 0 };

        // Get attendance in the relevant period
        let attendanceQuery = supabase
          .from("attendance")
          .select("member_id, checked_in_at")
          .eq("church_id", profile.church_id)
          .in("member_id", memberIds)
          .gte("checked_in_at", cutoffStart.toISOString());

        attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: recentAttendance } = await attendanceQuery;
        
        // Group by member
        const lastCheckinMap: Record<string, string> = {};
        (recentAttendance || []).forEach(a => {
          if (!lastCheckinMap[a.member_id] || a.checked_in_at > lastCheckinMap[a.member_id]) {
            lastCheckinMap[a.member_id] = a.checked_in_at;
          }
        });

        // Filter members: last attendance was 4-8 weeks ago
        results = (allMembers || [])
          .filter(m => {
            const lastCheckin = lastCheckinMap[m.id];
            if (!lastCheckin) return false;
            const checkinDate = new Date(lastCheckin);
            return checkinDate >= cutoffStart && checkinDate <= cutoffEnd;
          })
          .map(m => ({
            ...m,
            last_checkin: lastCheckinMap[m.id],
          }));
      } else if (segment === "cross_branch") {
        // Cross-branch attendees
        let query = supabase
          .from("attendance")
          .select("member_id, checked_in_at, members!inner(id, full_name, phone, email, membership_status, gender, date_of_birth, branch_id, created_at)")
          .eq("church_id", profile.church_id)
          .eq("is_cross_branch", true)
          .gte("checked_in_at", filters.startDate.toISOString())
          .lte("checked_in_at", filters.endDate.toISOString());

        query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data } = await query;
        
        const memberMap: Record<string, MemberResult & { checkin_count: number }> = {};
        (data || []).forEach(a => {
          const member = a.members as any;
          if (!memberMap[member.id]) {
            memberMap[member.id] = { ...member, checkin_count: 0, last_checkin: a.checked_in_at };
          }
          memberMap[member.id].checkin_count++;
          if (a.checked_in_at > memberMap[member.id].last_checkin!) {
            memberMap[member.id].last_checkin = a.checked_in_at;
          }
        });

        results = Object.values(memberMap);
      } else if (segment === "returning_visitors") {
        // Visitors who have attended more than once
        let query = supabase
          .from("attendance")
          .select("member_id, checked_in_at, members!inner(id, full_name, phone, email, membership_status, gender, date_of_birth, branch_id, created_at)")
          .eq("church_id", profile.church_id)
          .in("members.membership_status", ["visitor", "first_timer"])
          .gte("checked_in_at", filters.startDate.toISOString())
          .lte("checked_in_at", filters.endDate.toISOString());

        query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data } = await query;
        
        const memberMap: Record<string, MemberResult & { checkin_count: number }> = {};
        (data || []).forEach(a => {
          const member = a.members as any;
          if (!memberMap[member.id]) {
            memberMap[member.id] = { ...member, checkin_count: 0, last_checkin: a.checked_in_at };
          }
          memberMap[member.id].checkin_count++;
        });

        // Only include those with 2+ check-ins
        results = Object.values(memberMap).filter(m => m.checkin_count >= 2);
      } else {
        // Standard segments based on attendance + membership status
        let query = supabase
          .from("attendance")
          .select("member_id, checked_in_at, members!inner(id, full_name, phone, email, membership_status, gender, date_of_birth, branch_id, created_at)")
          .eq("church_id", profile.church_id)
          .gte("checked_in_at", filters.startDate.toISOString())
          .lte("checked_in_at", filters.endDate.toISOString());

        // Apply membership status filter
        if (segment === "visitors") {
          query = query.eq("members.membership_status", "visitor");
        } else if (segment === "first_timers") {
          query = query.eq("members.membership_status", "first_timer");
        } else if (segment === "members") {
          query = query.eq("members.membership_status", "member");
        }

        query = applyBranchFilter(query, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data } = await query;
        
        // Deduplicate by member
        const memberMap: Record<string, MemberResult & { checkin_count: number }> = {};
        (data || []).forEach(a => {
          const member = a.members as any;
          if (!memberMap[member.id]) {
            memberMap[member.id] = { ...member, checkin_count: 0, last_checkin: a.checked_in_at };
          }
          memberMap[member.id].checkin_count++;
          if (a.checked_in_at > memberMap[member.id].last_checkin!) {
            memberMap[member.id].last_checkin = a.checked_in_at;
          }
        });

        results = Object.values(memberMap);
      }

      // Add branch names
      const branchMap = new Map((branches || []).map(b => [b.id, b.name]));
      results = results.map(m => ({
        ...m,
        branch_name: branchMap.get(m.branch_id) || "Unknown",
      }));

      return { members: results, total: results.length };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Main Component ===================
export default function MemberDrilldownPage() {
  const [searchParams] = useSearchParams();
  const { filters } = useAnalyticsFilters();
  const { data: branches } = useBranches();
  
  // Get segment from URL, default to "all"
  const segment = (searchParams.get("segment") as MemberSegment) || "all";
  const segmentConfig = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.all;
  
  const { data, isLoading } = useSegmentedMembers(segment);
  const periodLabel = formatDateRangeLabel(filters);
  
  // Get branch name for display
  const branchName = useMemo(() => {
    if (!filters.branchId) return "All Branches";
    const branch = branches?.find(b => b.id === filters.branchId);
    return branch?.name || "Selected Branch";
  }, [filters.branchId, branches]);

  const Icon = segmentConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header with context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Member Drilldown</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            segmentConfig.variant === "accent" ? "bg-accent/10" :
            segmentConfig.variant === "success" ? "bg-green-500/10" :
            segmentConfig.variant === "warning" ? "bg-amber-500/10" :
            segmentConfig.variant === "destructive" ? "bg-red-500/10" :
            "bg-primary/10"
          }`}>
            <Icon className={`w-6 h-6 ${
              segmentConfig.variant === "accent" ? "text-accent" :
              segmentConfig.variant === "success" ? "text-green-600" :
              segmentConfig.variant === "warning" ? "text-amber-600" :
              segmentConfig.variant === "destructive" ? "text-red-600" :
              "text-primary"
            }`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {segmentConfig.label} — {periodLabel}
            </h1>
            <p className="text-muted-foreground">
              {segmentConfig.description} • {branchName}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar showServiceFilter={false} />

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                segmentConfig.variant === "accent" ? "bg-accent/10" :
                segmentConfig.variant === "success" ? "bg-green-500/10" :
                segmentConfig.variant === "warning" ? "bg-amber-500/10" :
                segmentConfig.variant === "destructive" ? "bg-red-500/10" :
                "bg-primary/10"
              }`}>
                <Icon className={`w-6 h-6 ${
                  segmentConfig.variant === "accent" ? "text-accent" :
                  segmentConfig.variant === "success" ? "text-green-600" :
                  segmentConfig.variant === "warning" ? "text-amber-600" :
                  segmentConfig.variant === "destructive" ? "text-red-600" :
                  "text-primary"
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total {segmentConfig.label}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold">{data?.total?.toLocaleString() || 0}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Member List</CardTitle>
          <CardDescription>
            Showing {data?.members?.length || 0} {segmentConfig.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !data?.members?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No {segmentConfig.label.toLowerCase()} found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Branch</TableHead>
                    {(segment === "all" || segment === "members" || segment === "visitors" || segment === "first_timers" || segment === "returning_visitors") && (
                      <TableHead className="text-right">Check-ins</TableHead>
                    )}
                    {(segment === "absentees" || segment === "at_risk") && (
                      <TableHead>Last Seen</TableHead>
                    )}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member: any) => {
                    const age = member.date_of_birth 
                      ? differenceInYears(new Date(), parseISO(member.date_of_birth))
                      : null;
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.membership_status?.replace("_", " ") || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{member.gender || "—"}</TableCell>
                        <TableCell>{age !== null ? age : "—"}</TableCell>
                        <TableCell>{member.branch_name || "—"}</TableCell>
                        {(segment === "all" || segment === "members" || segment === "visitors" || segment === "first_timers" || segment === "returning_visitors") && (
                          <TableCell className="text-right">{member.checkin_count || 0}</TableCell>
                        )}
                        {(segment === "absentees" || segment === "at_risk") && (
                          <TableCell>
                            {member.last_checkin 
                              ? format(parseISO(member.last_checkin), "MMM d, yyyy")
                              : "Never"
                            }
                          </TableCell>
                        )}
                        <TableCell>
                          {member.phone && (
                            <a href={`tel:${member.phone}`} className="p-2 hover:bg-muted rounded-md inline-block">
                              <Phone className="w-4 h-4 text-primary" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
