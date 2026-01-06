import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";

export interface ServicePeriod {
  serviceId: string;
  serviceDate: string;
  serviceName: string;
  branchId: string;
  startTime: string | null;
}

export interface AggregatedPeriod {
  periodStart: Date;
  periodEnd: Date;
  label: string;
  serviceCount: number;
  serviceIds: string[];
}

/**
 * Hook to fetch church creation date for timeline bounds
 */
export function useChurchCreatedAt() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["church-created-at", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const { data } = await supabase
        .from("churches")
        .select("created_at")
        .eq("id", profile.church_id)
        .single();

      return data?.created_at ? new Date(data.created_at) : null;
    },
    enabled: !!profile?.church_id,
    staleTime: Infinity, // Church creation date doesn't change
  });
}

/**
 * Hook to fetch service instances for timeline axis
 * Returns only services that actually occurred (with optional branch filtering)
 */
export function useServiceInstances(
  startDate: Date,
  endDate: Date,
  branchId?: string
) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["service-instances", profile?.church_id, startDate.toISOString(), endDate.toISOString(), branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("services")
        .select("id, service_date, name, branch_id, start_time")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(startDate, "yyyy-MM-dd"))
        .lte("service_date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true })
        .order("start_time", { ascending: true });

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(s => ({
        serviceId: s.id,
        serviceDate: s.service_date,
        serviceName: s.name,
        branchId: s.branch_id,
        startTime: s.start_time,
      })) as ServicePeriod[];
    },
    enabled: !!profile?.church_id,
  });
}

/**
 * Aggregates services into weekly or monthly periods
 * Only returns periods that contain at least one service
 */
export function aggregateServicePeriods(
  services: ServicePeriod[],
  aggregation: "daily" | "weekly" | "monthly"
): AggregatedPeriod[] {
  if (!services.length) return [];

  const periodMap = new Map<string, AggregatedPeriod>();

  services.forEach(service => {
    const date = parseISO(service.serviceDate);
    let periodStart: Date;
    let periodEnd: Date;
    let label: string;
    let key: string;

    if (aggregation === "daily") {
      periodStart = new Date(date);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(date);
      periodEnd.setHours(23, 59, 59, 999);
      label = format(date, "MMM d");
      key = format(date, "yyyy-MM-dd");
    } else if (aggregation === "weekly") {
      periodStart = startOfWeek(date, { weekStartsOn: 0 });
      periodEnd = endOfWeek(date, { weekStartsOn: 0 });
      label = format(periodStart, "'W'w");
      key = format(periodStart, "yyyy-'W'ww");
    } else {
      periodStart = startOfMonth(date);
      periodEnd = endOfMonth(date);
      label = format(date, "MMM yyyy");
      key = format(date, "yyyy-MM");
    }

    if (!periodMap.has(key)) {
      periodMap.set(key, {
        periodStart,
        periodEnd,
        label,
        serviceCount: 0,
        serviceIds: [],
      });
    }

    const period = periodMap.get(key)!;
    period.serviceCount++;
    period.serviceIds.push(service.serviceId);
  });

  return Array.from(periodMap.values()).sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
  );
}

/**
 * Determines the best aggregation level based on date range and service count
 */
export function getAggregationLevel(
  daysDiff: number,
  serviceCount: number
): "daily" | "weekly" | "monthly" {
  // For short ranges with few services, show daily (per service date)
  if (daysDiff <= 14 || serviceCount <= 7) {
    return "daily";
  }
  // For medium ranges, show weekly
  if (daysDiff <= 90 || serviceCount <= 30) {
    return "weekly";
  }
  // For long ranges, show monthly
  return "monthly";
}

/**
 * Hook to build service-driven attendance trend data
 * Plots only on actual service dates/periods, not continuous calendar
 * Includes total, members, visitors, and absentees per service
 */
export function useServiceDrivenAttendanceTrend(
  startDate: Date,
  endDate: Date,
  branchId?: string,
  serviceIds?: string[]
) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();
  const { data: churchCreatedAt } = useChurchCreatedAt();

  return useQuery({
    queryKey: ["service-driven-attendance", profile?.church_id, startDate.toISOString(), endDate.toISOString(), branchId, serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { data: [], hasData: false, aggregation: "daily" as const };

      // Adjust start date to church creation if needed
      const effectiveStart = churchCreatedAt && churchCreatedAt > startDate 
        ? churchCreatedAt 
        : startDate;

      // Fetch services in range
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name, branch_id, start_time")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(effectiveStart, "yyyy-MM-dd"))
        .lte("service_date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);

      // Filter by specific service IDs if provided
      if (serviceIds && serviceIds.length > 0) {
        servicesQuery = servicesQuery.in("id", serviceIds);
      }

      const { data: services } = await servicesQuery;

      if (!services?.length) {
        return { data: [], hasData: false, aggregation: "daily" as const };
      }

      // Get all active members for absentee calculation
      let membersQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .eq("membership_status", "active");

      membersQuery = applyBranchFilter(membersQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: allMembers } = await membersQuery;
      const totalActiveMembers = allMembers?.length || 0;

      // Fetch attendance for all services
      const fetchedServiceIds = services.map(s => s.id);
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id, member_id, checked_in_at, members!inner(membership_status)")
        .eq("church_id", profile.church_id)
        .in("service_id", fetchedServiceIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Fetch visitor check-ins for all services
      let visitorCheckinsQuery = supabase
        .from("visitor_checkins")
        .select("service_id, visitor_id")
        .eq("church_id", profile.church_id)
        .in("service_id", fetchedServiceIds);

      const { data: visitorCheckins } = await visitorCheckinsQuery;

      // Fetch visitors registered on service dates (first_visit_date matches service date)
      const serviceDates = services.map(s => s.service_date);
      let visitorsQuery = supabase
        .from("visitors")
        .select("id, first_visit_date")
        .eq("church_id", profile.church_id)
        .in("first_visit_date", serviceDates);

      visitorsQuery = applyBranchFilter(visitorsQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: visitors } = await visitorsQuery;

      // Group attendance by service
      const attendanceByService = new Map<string, any[]>();
      (attendance || []).forEach(a => {
        if (!attendanceByService.has(a.service_id)) {
          attendanceByService.set(a.service_id, []);
        }
        attendanceByService.get(a.service_id)!.push(a);
      });

      // Group visitor check-ins by service
      const visitorsByService = new Map<string, Set<string>>();
      (visitorCheckins || []).forEach(vc => {
        if (!visitorsByService.has(vc.service_id)) {
          visitorsByService.set(vc.service_id, new Set());
        }
        visitorsByService.get(vc.service_id)!.add(vc.visitor_id);
      });

      // Group visitors by first_visit_date (registration date)
      const visitorsByDate = new Map<string, Set<string>>();
      (visitors || []).forEach(v => {
        if (!visitorsByDate.has(v.first_visit_date)) {
          visitorsByDate.set(v.first_visit_date, new Set());
        }
        visitorsByDate.get(v.first_visit_date)!.add(v.id);
      });

      // Build trend data per service (always daily for service-level tracking)
      const trendData = services.map(service => {
        const serviceAttendance = attendanceByService.get(service.id) || [];
        const checkinVisitorIds = visitorsByService.get(service.id) || new Set<string>();
        const registeredVisitorIds = visitorsByDate.get(service.service_date) || new Set<string>();
        
        // Combine check-in visitors and registered visitors (unique)
        const allVisitorIds = new Set([...checkinVisitorIds, ...registeredVisitorIds]);
        const serviceVisitorCount = allVisitorIds.size;
        
        // Count member check-ins (active members)
        const memberCheckins = serviceAttendance.filter((a: any) => 
          a.members?.membership_status === "active"
        ).length;

        // Unique member IDs who attended this service
        const attendedMemberIds = new Set(serviceAttendance.map((a: any) => a.member_id));
        
        // Absentees = total active members - members who attended
        const absentees = totalActiveMembers - attendedMemberIds.size;

        return {
          date: format(parseISO(service.service_date), "MMM d"),
          fullDate: format(parseISO(service.service_date), "MMM d, yyyy"),
          serviceName: service.name,
          total: serviceAttendance.length + serviceVisitorCount,
          members: memberCheckins,
          visitors: serviceVisitorCount,
          absentees: Math.max(0, absentees),
          serviceCount: 1,
        };
      });

      return {
        data: trendData,
        hasData: trendData.length > 0,
        aggregation: "daily" as const,
      };
    },
    enabled: !!profile?.church_id,
  });
}

/**
 * Hook for service-driven member growth trend
 * Shows new registrations mapped to service periods
 */
export function useServiceDrivenMemberGrowth(
  startDate: Date,
  endDate: Date,
  branchId?: string
) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();
  const { data: churchCreatedAt } = useChurchCreatedAt();

  return useQuery({
    queryKey: ["service-driven-member-growth", profile?.church_id, startDate.toISOString(), endDate.toISOString(), branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { data: [], hasData: false, aggregation: "weekly" as const };

      const effectiveStart = churchCreatedAt && churchCreatedAt > startDate 
        ? churchCreatedAt 
        : startDate;

      // Fetch services to determine active periods
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, branch_id")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(effectiveStart, "yyyy-MM-dd"))
        .lte("service_date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: services } = await servicesQuery;

      if (!services?.length) {
        return { data: [], hasData: false, aggregation: "weekly" as const };
      }

      // Get members registered in this period
      let membersQuery = supabase
        .from("members")
        .select("id, created_at, membership_status")
        .eq("church_id", profile.church_id)
        .gte("created_at", effectiveStart.toISOString())
        .lte("created_at", endDate.toISOString());

      membersQuery = applyBranchFilter(membersQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: members } = await membersQuery;

      // Determine aggregation
      const daysDiff = differenceInDays(endDate, effectiveStart);
      const aggregation = getAggregationLevel(daysDiff, services.length);

      // Create periods from services
      const servicePeriods = services.map(s => ({
        serviceId: s.id,
        serviceDate: s.service_date,
        serviceName: "",
        branchId: s.branch_id,
        startTime: null,
      }));

      const periods = aggregateServicePeriods(servicePeriods, aggregation);

      // Map member registrations to periods
      const growthData = periods.map(period => {
        const periodMembers = (members || []).filter(m => {
          const createdAt = new Date(m.created_at);
          return createdAt >= period.periodStart && createdAt <= period.periodEnd;
        });

        const newMembers = periodMembers.filter(m => 
          m.membership_status === "active"
        ).length;
        const visitors = periodMembers.filter(m => 
          m.membership_status === "inactive" || m.membership_status === "transferred"
        ).length;

        return {
          date: period.label,
          fullDate: format(period.periodStart, "MMM d, yyyy"),
          total: periodMembers.length,
          members: newMembers,
          visitors,
          serviceCount: period.serviceCount,
        };
      });

      return {
        data: growthData,
        hasData: growthData.length > 0,
        aggregation,
      };
    },
    enabled: !!profile?.church_id,
  });
}

/**
 * Hook for service-driven group joins trend
 */
export function useServiceDrivenGroupGrowth(
  startDate: Date,
  endDate: Date,
  branchId?: string
) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();
  const { data: churchCreatedAt } = useChurchCreatedAt();

  return useQuery({
    queryKey: ["service-driven-group-growth", profile?.church_id, startDate.toISOString(), endDate.toISOString(), branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { data: [], hasData: false };

      const effectiveStart = churchCreatedAt && churchCreatedAt > startDate 
        ? churchCreatedAt 
        : startDate;

      // Fetch services
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, branch_id")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(effectiveStart, "yyyy-MM-dd"))
        .lte("service_date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: services } = await servicesQuery;

      if (!services?.length) {
        return { data: [], hasData: false };
      }

      // Fetch member-group joins
      const { data: memberGroups } = await supabase
        .from("member_groups")
        .select("member_id, group_id, joined_at")
        .gte("joined_at", effectiveStart.toISOString())
        .lte("joined_at", endDate.toISOString());

      // Determine aggregation
      const daysDiff = differenceInDays(endDate, effectiveStart);
      const aggregation = getAggregationLevel(daysDiff, services.length);

      const servicePeriods = services.map(s => ({
        serviceId: s.id,
        serviceDate: s.service_date,
        serviceName: "",
        branchId: s.branch_id,
        startTime: null,
      }));

      const periods = aggregateServicePeriods(servicePeriods, aggregation);

      const growthData = periods.map(period => {
        const periodJoins = (memberGroups || []).filter(mg => {
          const joinedAt = new Date(mg.joined_at);
          return joinedAt >= period.periodStart && joinedAt <= period.periodEnd;
        }).length;

        return {
          period: period.label,
          newJoins: periodJoins,
        };
      });

      return {
        data: growthData,
        hasData: growthData.some(g => g.newJoins > 0),
      };
    },
    enabled: !!profile?.church_id,
  });
}
