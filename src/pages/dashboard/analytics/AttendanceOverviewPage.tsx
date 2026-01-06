import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  UsersRound,
  Activity,
  RefreshCw,
  Clock,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useActiveGroups } from "@/hooks/useGroupsData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO, addMinutes, parse, isBefore } from "date-fns";
import { useServiceDrivenAttendanceTrend } from "@/hooks/useServiceDrivenTimeline";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(280 65% 60%)"];

// =================== Attendance KPI Hook ===================
function useAttendanceKPIs() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["attendance-kpis", profile?.church_id, filters.branchId, filters.serviceIds, filters.startDate.toISOString(), filters.endDate.toISOString(), accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Fetch all attendance in date range
      let attendanceQuery = supabase
        .from("attendance")
        .select("id, member_id, checked_in_at, branch_id, service_id, members!inner(id, membership_status)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", filters.startDate.toISOString())
        .lte("checked_in_at", filters.endDate.toISOString());

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      // Apply service filter if specific services are selected
      if (filters.serviceIds.length > 0) {
        attendanceQuery = attendanceQuery.in("service_id", filters.serviceIds);
      }

      const { data: attendanceData } = await attendanceQuery;
      const attendance = attendanceData || [];

      // Total check-ins
      const totalCheckins = attendance.length;

      // Unique attendees
      const uniqueAttendeeIds = new Set(attendance.map(a => a.member_id));
      const uniqueAttendees = uniqueAttendeeIds.size;

      // Active vs Inactive/Transferred breakdown
      const memberCheckins = attendance.filter(a => 
        (a.members as any)?.membership_status === "active"
      ).length;
      const visitorCheckins = attendance.filter(a => 
        (a.members as any)?.membership_status === "inactive" || 
        (a.members as any)?.membership_status === "transferred"
      ).length;

      // Get total NEW visitors count for the filtered period (registered in date range)
      let newVisitorsQuery = supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      // Apply branch filter for visitors
      if (filters.branchId) {
        newVisitorsQuery = newVisitorsQuery.eq("branch_id", filters.branchId);
      } else if (accessibleBranchIds && accessibleBranchIds.length > 0) {
        newVisitorsQuery = newVisitorsQuery.in("branch_id", accessibleBranchIds);
      }

      let totalNewVisitors = 0;
      let totalReturningVisitors = 0;

      if (filters.serviceIds.length > 0) {
        // Get visitors registered on service dates for selected services
        const { data: servicesForDates } = await supabase
          .from("services")
          .select("service_date")
          .in("id", filters.serviceIds);
        
        const serviceDates = servicesForDates?.map(s => s.service_date) || [];
        
        if (serviceDates.length > 0) {
          const { count: newCount } = await supabase
            .from("visitors")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .in("first_visit_date", serviceDates);
          totalNewVisitors = newCount || 0;
        }

        // Get returning visitors (checked in for selected services, have 2+ total check-ins)
        const { data: visitorCheckinsData } = await supabase
          .from("visitor_checkins")
          .select("visitor_id")
          .eq("church_id", profile.church_id)
          .in("service_id", filters.serviceIds);
        
        const checkedInVisitorIds = [...new Set(visitorCheckinsData?.map(vc => vc.visitor_id) || [])];
        
        if (checkedInVisitorIds.length > 0) {
          // Count total check-ins per visitor
          const { data: allCheckins } = await supabase
            .from("visitor_checkins")
            .select("visitor_id")
            .eq("church_id", profile.church_id)
            .in("visitor_id", checkedInVisitorIds);
          
          const checkinCounts = new Map<string, number>();
          (allCheckins || []).forEach(vc => {
            checkinCounts.set(vc.visitor_id, (checkinCounts.get(vc.visitor_id) || 0) + 1);
          });
          
          // Returning = 2+ total check-ins
          totalReturningVisitors = checkedInVisitorIds.filter(id => (checkinCounts.get(id) || 0) >= 2).length;
        }
      } else {
        // No service filter - count visitors registered in date range
        newVisitorsQuery = newVisitorsQuery
          .gte("first_visit_date", filters.startDate.toISOString().split("T")[0])
          .lte("first_visit_date", filters.endDate.toISOString().split("T")[0]);
        
        const { count } = await newVisitorsQuery;
        totalNewVisitors = count || 0;

        // Get returning visitors who checked in during the period
        const { data: periodCheckins } = await supabase
          .from("visitor_checkins")
          .select("visitor_id, checked_in_at")
          .eq("church_id", profile.church_id)
          .gte("checked_in_at", filters.startDate.toISOString())
          .lte("checked_in_at", filters.endDate.toISOString());

        const checkedInVisitorIds = [...new Set(periodCheckins?.map(vc => vc.visitor_id) || [])];
        
        if (checkedInVisitorIds.length > 0) {
          const { data: allCheckins } = await supabase
            .from("visitor_checkins")
            .select("visitor_id")
            .eq("church_id", profile.church_id)
            .in("visitor_id", checkedInVisitorIds);
          
          const checkinCounts = new Map<string, number>();
          (allCheckins || []).forEach(vc => {
            checkinCounts.set(vc.visitor_id, (checkinCounts.get(vc.visitor_id) || 0) + 1);
          });
          
          totalReturningVisitors = checkedInVisitorIds.filter(id => (checkinCounts.get(id) || 0) >= 2).length;
        }
      }

      // Absentees: members who didn't attend ANY service within the filter period
      // Get all services in the filter period
      let servicesQuery = supabase
        .from("services")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", filters.startDate.toISOString().split("T")[0])
        .lte("service_date", filters.endDate.toISOString().split("T")[0]);

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      // Apply service filter if specific services are selected
      if (filters.serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", filters.serviceIds);
      }

      const { data: servicesData } = await servicesQuery;
      const serviceIdsInPeriod = (servicesData || []).map(s => s.id);

      if (serviceIdsInPeriod.length === 0) {
        // No services in period
        return {
          totalCheckins,
          uniqueAttendees,
          memberCheckins,
          visitorCheckins,
          totalNewVisitors,
          totalReturningVisitors,
          absentees: 0,
          totalMembers: 0,
        };
      }

      // Get all active members
      let membersQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .eq("membership_status", "active");

      membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      
      const { data: allMembers } = await membersQuery;
      const memberIds = (allMembers || []).map(m => m.id);

      // Get attendance for services in the period
      let periodAttendanceQuery = supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIdsInPeriod);

      periodAttendanceQuery = applyBranchFilter(periodAttendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: periodAttendance } = await periodAttendanceQuery;
      
      // Get unique member IDs who attended at least one service
      const attendedMemberIds = new Set((periodAttendance || []).map(a => a.member_id));

      // Absentees = members who didn't attend any service in the period
      const absentees = memberIds.filter(id => !attendedMemberIds.has(id)).length;

      return {
        totalCheckins,
        uniqueAttendees,
        memberCheckins,
        visitorCheckins,
        totalNewVisitors,
        totalReturningVisitors,
        absentees,
        totalMembers: memberIds.length,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Attendance Trend Hook (Service-Driven) ===================
function useAttendanceTrendData() {
  const { filters } = useAnalyticsFilters();
  
  return useServiceDrivenAttendanceTrend(
    filters.startDate,
    filters.endDate,
    filters.branchId || undefined,
    filters.serviceIds
  );
}


// =================== Multi-Group Attendance Trend Hook ===================
function useMultiGroupAttendanceTrend(groupIds: string[]) {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["multi-group-attendance-trend", profile?.church_id, groupIds, filters.startDate.toISOString(), filters.endDate.toISOString(), filters.branchId, filters.serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id || groupIds.length === 0) return { data: [], groups: [] };

      // Get services in the filter period
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"))
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      if (filters.serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", filters.serviceIds);
      }

      const { data: services } = await servicesQuery;
      if (!services?.length) return { data: [], groups: [] };

      // Get group names
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id, name")
        .in("id", groupIds);

      const groupNameMap = new Map((groupsData || []).map(g => [g.id, g.name]));

      // Get members for all selected groups
      const { data: allGroupMembers } = await supabase
        .from("member_groups")
        .select("member_id, group_id")
        .in("group_id", groupIds);

      // Group members by group
      const membersByGroup = new Map<string, string[]>();
      groupIds.forEach(gid => membersByGroup.set(gid, []));
      (allGroupMembers || []).forEach(gm => {
        const members = membersByGroup.get(gm.group_id);
        if (members) members.push(gm.member_id);
      });

      // Get all member IDs across all groups
      const allMemberIds = [...new Set((allGroupMembers || []).map(gm => gm.member_id))];
      if (allMemberIds.length === 0) return { data: [], groups: groupIds.map(id => ({ id, name: groupNameMap.get(id) || "Unknown" })) };

      // Get attendance for all members in the services
      const serviceIds = services.map(s => s.id);
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id, member_id")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds)
        .in("member_id", allMemberIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Group attendance by service and member
      const attendanceByServiceMember = new Map<string, Set<string>>();
      (attendance || []).forEach(a => {
        if (!attendanceByServiceMember.has(a.service_id)) {
          attendanceByServiceMember.set(a.service_id, new Set());
        }
        attendanceByServiceMember.get(a.service_id)!.add(a.member_id);
      });

      // Build trend data with attendance for each group
      const trendData = services.map(service => {
        const serviceAttendees = attendanceByServiceMember.get(service.id) || new Set();
        
        const dataPoint: any = {
          date: format(parseISO(service.service_date), "MMM d"),
          fullDate: format(parseISO(service.service_date), "MMM d, yyyy"),
          serviceName: service.name,
        };

        // Add attendance count for each group
        groupIds.forEach(groupId => {
          const groupMembers = membersByGroup.get(groupId) || [];
          const attendedCount = groupMembers.filter(mid => serviceAttendees.has(mid)).length;
          dataPoint[groupId] = attendedCount;
          dataPoint[`${groupId}_total`] = groupMembers.length;
        });

        return dataPoint;
      });

      return {
        data: trendData,
        groups: groupIds.map(id => ({ id, name: groupNameMap.get(id) || "Unknown" })),
      };
    },
    enabled: !!profile?.church_id && groupIds.length > 0,
  });
}

// =================== Early Arrival Rate Trend Hook ===================
function useEarlyArrivalRateTrend() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["early-arrival-rate-trend", profile?.church_id, filters.startDate.toISOString(), filters.endDate.toISOString(), filters.branchId, filters.serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get services in the filter period
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name, start_time")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"))
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      if (filters.serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", filters.serviceIds);
      }

      const { data: services } = await servicesQuery;
      if (!services?.length) return [];

      const serviceIds = services.map(s => s.id);

      // Get all attendance for these services
      let attendanceQuery = supabase
        .from("attendance")
        .select("id, service_id, checked_in_at")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Group attendance by service
      const attendanceByService = new Map<string, { checkedInAt: string }[]>();
      (attendance || []).forEach(a => {
        if (!attendanceByService.has(a.service_id)) {
          attendanceByService.set(a.service_id, []);
        }
        attendanceByService.get(a.service_id)!.push({ checkedInAt: a.checked_in_at });
      });

      // Calculate early arrival rate for each service
      const trendData = services.map(service => {
        const serviceAttendance = attendanceByService.get(service.id) || [];
        const totalCheckins = serviceAttendance.length;
        
        if (totalCheckins === 0 || !service.start_time) {
          return {
            date: format(parseISO(service.service_date), "MMM d"),
            fullDate: format(parseISO(service.service_date), "MMM d, yyyy"),
            serviceName: service.name,
            earlyRate: 0,
            lateRate: 0,
            earlyCount: 0,
            lateCount: 0,
            totalCheckins: 0,
          };
        }

        // Parse service start time and add 30 minute grace period
        const serviceDateTime = parse(
          `${service.service_date} ${service.start_time}`,
          "yyyy-MM-dd HH:mm:ss",
          new Date()
        );
        const gracePeriodEnd = addMinutes(serviceDateTime, 30);

        let earlyCount = 0;
        let lateCount = 0;

        serviceAttendance.forEach(a => {
          const checkinTime = parseISO(a.checkedInAt);
          if (isBefore(checkinTime, gracePeriodEnd)) {
            earlyCount++;
          } else {
            lateCount++;
          }
        });

        return {
          date: format(parseISO(service.service_date), "MMM d"),
          fullDate: format(parseISO(service.service_date), "MMM d, yyyy"),
          serviceName: service.name,
          earlyRate: Math.round((earlyCount / totalCheckins) * 100),
          lateRate: Math.round((lateCount / totalCheckins) * 100),
          earlyCount,
          lateCount,
          totalCheckins,
        };
      });

      return trendData;
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Gender Attendance Trend Hook ===================
function useGenderAttendanceTrend() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["gender-attendance-trend", profile?.church_id, filters.startDate.toISOString(), filters.endDate.toISOString(), filters.branchId, filters.serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get services in the filter period
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", format(filters.startDate, "yyyy-MM-dd"))
        .lte("service_date", format(filters.endDate, "yyyy-MM-dd"))
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      if (filters.serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", filters.serviceIds);
      }

      const { data: services } = await servicesQuery;
      if (!services?.length) return [];

      const serviceIds = services.map(s => s.id);

      // Get all attendance with member gender info for these services
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id, member_id, members!inner(gender)")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Group attendance by service and gender
      const attendanceByService = new Map<string, { male: number; female: number }>();
      (attendance || []).forEach(a => {
        if (!attendanceByService.has(a.service_id)) {
          attendanceByService.set(a.service_id, { male: 0, female: 0 });
        }
        const counts = attendanceByService.get(a.service_id)!;
        const gender = (a.members as any)?.gender;
        if (gender === "male") {
          counts.male++;
        } else if (gender === "female") {
          counts.female++;
        }
      });

      // Build trend data
      const trendData = services.map(service => {
        const genderCounts = attendanceByService.get(service.id) || { male: 0, female: 0 };
        
        return {
          date: format(parseISO(service.service_date), "MMM d"),
          fullDate: format(parseISO(service.service_date), "MMM d, yyyy"),
          serviceName: service.name,
          male: genderCounts.male,
          female: genderCounts.female,
        };
      });

      return trendData;
    },
    enabled: !!profile?.church_id,
  });
}

// =================== KPI Card Component ===================
interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  href?: string;
  isLoading?: boolean;
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "destructive";
}

function KPICard({ title, value, icon: Icon, description, href, isLoading, variant = "default" }: KPICardProps) {
  const variantStyles = {
    default: { bg: "bg-muted/50", iconBg: "bg-muted", iconColor: "text-muted-foreground" },
    primary: { bg: "bg-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary" },
    accent: { bg: "bg-accent/5", iconBg: "bg-accent/10", iconColor: "text-accent" },
    success: { bg: "bg-green-500/5", iconBg: "bg-green-500/10", iconColor: "text-green-600" },
    warning: { bg: "bg-amber-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
    destructive: { bg: "bg-destructive/5", iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  };

  const styles = variantStyles[variant];

  const content = (
    <Card className={`relative overflow-hidden transition-all ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
          </div>
        )}
        {href && !isLoading && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center text-xs text-primary font-medium">
            View details <ChevronRight className="w-3 h-3 ml-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

// =================== Main Component ===================
export default function AttendanceOverviewPage() {
  const { filters } = useAnalyticsFilters();
  const { data: kpis, isLoading: kpisLoading } = useAttendanceKPIs();
  const { data: trendResult, isLoading: trendLoading } = useAttendanceTrendData();
  const { data: groups } = useActiveGroups();
  
  // Group attendance state - now supports multiple selection
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  
  // Set default group when groups load
  useMemo(() => {
    if (groups?.length && selectedGroupIds.length === 0) {
      setSelectedGroupIds([groups[0].id]);
    }
  }, [groups, selectedGroupIds.length]);
  
  const { data: groupTrendResult, isLoading: groupTrendLoading } = useMultiGroupAttendanceTrend(selectedGroupIds);
  const { data: earlyArrivalData, isLoading: earlyArrivalLoading } = useEarlyArrivalRateTrend();
  const { data: genderTrendData, isLoading: genderTrendLoading } = useGenderAttendanceTrend();

  const trendData = trendResult?.data || [];
  const hasTrendData = trendResult?.hasData || false;
  
  const periodLabel = formatDateRangeLabel(filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Attendance Overview"
        description="Comprehensive attendance metrics and trends"
        icon={BarChart3}
        backTo="/app/analytics"
      />

      {/* Filter Bar */}
      <AnalyticsFilterBar />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard
          title="Total Check-ins"
          value={kpis?.totalCheckins || 0}
          icon={UserCheck}
          description={periodLabel}
          isLoading={kpisLoading}
          variant="primary"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=all`}
        />
        <KPICard
          title="Unique Attendees"
          value={kpis?.uniqueAttendees || 0}
          icon={Users}
          description="Distinct people"
          isLoading={kpisLoading}
          variant="accent"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=all`}
        />
        <KPICard
          title="Member Check-ins"
          value={kpis?.memberCheckins || 0}
          icon={UsersRound}
          isLoading={kpisLoading}
          variant="success"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=members`}
        />
        <KPICard
          title="New Visitors"
          value={kpis?.totalNewVisitors || 0}
          icon={UserPlus}
          description="Registered in period"
          isLoading={kpisLoading}
          variant="warning"
          href="/app/visitors"
        />
        <KPICard
          title="Returning Visitors"
          value={kpis?.totalReturningVisitors || 0}
          icon={RefreshCw}
          description="2+ check-ins"
          isLoading={kpisLoading}
          variant="accent"
          href="/app/visitors?segment=returning"
        />
        <KPICard
          title="Absentees"
          value={kpis?.absentees || 0}
          icon={UserMinus}
          description="No attendance in period"
          isLoading={kpisLoading}
          variant="destructive"
          href={`/app/analytics/drilldown?period=${filters.datePreset}${filters.branchId ? `&branch=${filters.branchId}` : ""}${filters.serviceIds.length > 0 ? `&services=${filters.serviceIds.join(",")}` : ""}&segment=absentees`}
        />
      </div>

      {/* Attendance Trend Charts - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Total Check-ins Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Total Check-ins Trend
            </CardTitle>
            <CardDescription className="text-xs">
              All check-ins per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData && trendData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Line
                    type="linear"
                    dataKey="total"
                    name="Total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Check-ins Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UsersRound className="w-4 h-4 text-green-600" />
              Member Check-ins Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Active member attendance per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData && trendData.some(d => d.members > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Line
                    type="linear"
                    dataKey="members"
                    name="Members"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142 76% 36%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visitors Trend (New vs Returning) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-600" />
              Visitors Trend
            </CardTitle>
            <CardDescription className="text-xs">
              New vs returning visitors per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Legend />
                  <Line
                    type="linear"
                    dataKey="newVisitors"
                    name="New Visitors"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(38 92% 50%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="linear"
                    dataKey="returningVisitors"
                    name="Returning Visitors"
                    stroke="hsl(280 65% 60%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(280 65% 60%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absentees Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-red-600" />
              Absentees Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Members absent per service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  <Line
                    type="linear"
                    dataKey="absentees"
                    name="Absentees"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Attendance Card - Full Width */}
      {groups && groups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-primary" />
                  Group Attendance Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  {comparisonMode ? "Compare attendance across groups" : "Attendance of group members per service"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={comparisonMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setComparisonMode(!comparisonMode);
                      if (!comparisonMode && selectedGroupIds.length === 1 && groups.length > 1) {
                        // Add second group when enabling comparison
                        setSelectedGroupIds([selectedGroupIds[0], groups.find(g => g.id !== selectedGroupIds[0])?.id || groups[1].id]);
                      }
                    }}
                  >
                    Compare Groups
                  </Button>
                </div>
                {comparisonMode ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.slice(0, 5).map((group, index) => (
                      <Button
                        key={group.id}
                        variant={selectedGroupIds.includes(group.id) ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        style={selectedGroupIds.includes(group.id) ? { backgroundColor: COLORS[selectedGroupIds.indexOf(group.id) % COLORS.length] } : {}}
                        onClick={() => {
                          if (selectedGroupIds.includes(group.id)) {
                            if (selectedGroupIds.length > 1) {
                              setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                            }
                          } else {
                            setSelectedGroupIds([...selectedGroupIds, group.id]);
                          }
                        }}
                      >
                        {group.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Select
                    value={selectedGroupIds[0] || ""}
                    onValueChange={(value) => setSelectedGroupIds([value])}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {groupTrendLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : groupTrendResult?.data && groupTrendResult.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={groupTrendResult.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  />
                  {comparisonMode && <Legend />}
                  {groupTrendResult.groups.map((group, index) => (
                    <Line
                      key={group.id}
                      type="linear"
                      dataKey={group.id}
                      name={group.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                <UsersRound className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No attendance data for selected group(s)</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Early Arrival Rate Trend - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            Early Arrival Rate Trend
          </CardTitle>
          <CardDescription className="text-xs">
            Percentage of check-ins arriving before start time + 30 min grace period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earlyArrivalLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : earlyArrivalData && earlyArrivalData.length > 0 && earlyArrivalData.some(d => d.totalCheckins > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={earlyArrivalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                  formatter={(value: number, name: string, props: any) => {
                    const data = props.payload;
                    return [`${value}% (${data.earlyCount}/${data.totalCheckins})`, name];
                  }}
                />
                <Line
                  type="linear"
                  dataKey="earlyRate"
                  name="Early Rate"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(142 76% 36%)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
              <Clock className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No check-in data with timing available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gender Attendance Trend - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Gender Attendance Trend
          </CardTitle>
          <CardDescription className="text-xs">
            Male vs Female check-ins per service
          </CardDescription>
        </CardHeader>
        <CardContent>
          {genderTrendLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : genderTrendData && genderTrendData.length > 0 && genderTrendData.some(d => d.male > 0 || d.female > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={genderTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.serviceName || payload[0]?.payload?.fullDate || ""}
                />
                <Legend />
                <Line
                  type="linear"
                  dataKey="male"
                  name="Male"
                  stroke="hsl(221 83% 53%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(221 83% 53%)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="linear"
                  dataKey="female"
                  name="Female"
                  stroke="hsl(330 81% 60%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(330 81% 60%)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No gender data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
