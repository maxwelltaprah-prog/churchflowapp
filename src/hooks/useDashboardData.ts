import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { startOfDay, endOfDay, subDays, subWeeks, startOfMonth, endOfMonth, format, parseISO, differenceInYears } from "date-fns";

export type DateRange = "today" | "this_week" | "this_month";

// Helper to get date range
const getDateRange = (range: DateRange) => {
  const today = new Date();
  switch (range) {
    case "today":
      return { start: startOfDay(today), end: endOfDay(today) };
    case "this_week":
      const weekStart = subDays(today, today.getDay());
      return { start: startOfDay(weekStart), end: endOfDay(today) };
    case "this_month":
      return { start: startOfMonth(today), end: endOfDay(today) };
  }
};

// Branch filtering is applied inline in each query to avoid TypeScript generic issues

// =================== SECTION 1: TODAY'S SNAPSHOT KPIs ===================
export function useTodayKPIs(branchId?: string, serviceId?: string, dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["dashboard-kpis", profile?.church_id, branchId, serviceId, dateRange, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { totalAttendance: 0, visitorsToday: 0, firstTimersToday: 0, returningVisitorsToday: 0, lateArrivals: 0, change: 0 };
      }

      // Build attendance query
      let query = supabase
        .from("attendance")
        .select("*, members!inner(membership_status, created_at)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);
      if (serviceId) query = query.eq("service_id", serviceId);

      const { data: records, error } = await query;
      if (error) throw error;

      const data = records || [];
      const totalAttendance = data.length;
      
      const visitorsToday = data.filter((r: any) => r.members?.membership_status === "visitor").length;
      const firstTimersToday = data.filter((r: any) => r.members?.membership_status === "first_timer").length;
      
      // Returning visitors - visitors who attended before
      const visitorMemberIds = data
        .filter((r: any) => r.members?.membership_status === "visitor")
        .map((r: any) => r.member_id);
      
      let returningVisitorsToday = 0;
      if (visitorMemberIds.length > 0) {
        const { count } = await supabase
          .from("attendance")
          .select("member_id", { count: "exact", head: true })
          .eq("church_id", profile.church_id)
          .in("member_id", visitorMemberIds)
          .lt("checked_in_at", start.toISOString());
        returningVisitorsToday = count || 0;
      }

      // Late arrivals - checked in 30+ mins after first check-in
      let lateArrivals = 0;
      if (data.length > 0) {
        const sorted = [...data].sort((a, b) => 
          new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
        );
        const firstCheckin = new Date(sorted[0].checked_in_at);
        const lateThreshold = new Date(firstCheckin.getTime() + 30 * 60 * 1000);
        lateArrivals = data.filter((r) => new Date(r.checked_in_at) > lateThreshold).length;
      }

      // Get previous period comparison
      const prevStart = subWeeks(start, 1);
      const prevEnd = subWeeks(end, 1);
      let prevQuery = supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", prevStart.toISOString())
        .lte("checked_in_at", prevEnd.toISOString());
      prevQuery = applyBranchFilter(prevQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { count: prevAttendance } = await prevQuery;
      const change = prevAttendance ? Math.round(((totalAttendance - prevAttendance) / prevAttendance) * 100) : 0;

      return {
        totalAttendance,
        visitorsToday,
        firstTimersToday,
        returningVisitorsToday,
        lateArrivals,
        change
      };
    },
    enabled: !!profile?.church_id && !accessLoading,
    refetchInterval: 30000
  });
}

// =================== SECTION 2: TODAY'S FLOW (Check-in Trend) ===================
// For "today" view: shows time-of-day distribution for the selected service(s)
// For other date ranges: shows service-driven trend (per service date, not continuous calendar)
export function useCheckinTrend(branchId?: string, serviceId?: string, dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["checkin-trend", profile?.church_id, branchId, serviceId, dateRange, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { data: [], hasData: false, isTimeOfDay: dateRange === "today" };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { data: [], hasData: false, isTimeOfDay: dateRange === "today" };
      }

      // For "today" view, show time-of-day distribution
      if (dateRange === "today") {
        // First, fetch services to determine time window
        let servicesQuery = supabase
          .from("services")
          .select("id, start_time, end_time")
          .eq("church_id", profile.church_id)
          .eq("service_date", format(start, "yyyy-MM-dd"))
          .eq("is_active", true);

        servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);
        if (serviceId) servicesQuery = servicesQuery.eq("id", serviceId);

        const { data: todayServices } = await servicesQuery;

        // Calculate time window based on service times
        let windowStart = 8; // Default: 8 AM
        let windowEnd = 14;  // Default: 2 PM

        if (todayServices?.length) {
          // Find earliest start time and latest end time
          let earliestStart: number | null = null;
          let latestEnd: number | null = null;

          todayServices.forEach(s => {
            if (s.start_time) {
              const [h] = s.start_time.split(":").map(Number);
              if (earliestStart === null || h < earliestStart) earliestStart = h;
            }
            if (s.end_time) {
              const [h] = s.end_time.split(":").map(Number);
              if (latestEnd === null || h > latestEnd) latestEnd = h;
            }
          });

          // If we have service times, use them: 2 hrs before start, 3 hrs after end
          if (earliestStart !== null) {
            windowStart = Math.max(0, earliestStart - 2);
          }
          if (latestEnd !== null) {
            windowEnd = Math.min(23, latestEnd + 3);
          } else if (earliestStart !== null) {
            // If no end time, assume 2 hour service + 3 hours after
            windowEnd = Math.min(23, earliestStart + 5);
          }
        }

        // Fetch attendance
        let query = supabase
          .from("attendance")
          .select("checked_in_at")
          .eq("church_id", profile.church_id)
          .gte("checked_in_at", start.toISOString())
          .lte("checked_in_at", end.toISOString())
          .order("checked_in_at");

        query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);
        if (serviceId) query = query.eq("service_id", serviceId);

        const { data, error } = await query;
        if (error) throw error;

        // Group by 15-min intervals within the dynamic window
        const buckets: Record<string, number> = {};
        for (let h = windowStart; h <= windowEnd; h++) {
          ["00", "15", "30", "45"].forEach(m => {
            buckets[`${h.toString().padStart(2, "0")}:${m}`] = 0;
          });
        }

        (data || []).forEach((r) => {
          const dt = parseISO(r.checked_in_at);
          const h = dt.getHours().toString().padStart(2, "0");
          const m = (Math.floor(dt.getMinutes() / 15) * 15).toString().padStart(2, "0");
          const key = `${h}:${m}`;
          if (buckets[key] !== undefined) buckets[key]++;
        });

        const chartData = Object.entries(buckets).map(([time, count]) => ({ time, checkins: count }));
        return { data: chartData, hasData: (data || []).length > 0, isTimeOfDay: true };
      }

      // For other date ranges, use service-driven timeline
      // Fetch services in range
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name, branch_id")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(start, "yyyy-MM-dd"))
        .lte("service_date", format(end, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: services, error: servicesError } = await servicesQuery;
      if (servicesError) throw servicesError;

      if (!services?.length) {
        return { data: [], hasData: false, isTimeOfDay: false };
      }

      const serviceIds = services.map(s => s.id);

      // Fetch attendance for these services
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: attendance, error: attendanceError } = await attendanceQuery;
      if (attendanceError) throw attendanceError;

      // Group attendance by service date
      const serviceMap = new Map(services.map(s => [s.id, s]));
      const dateAttendance: Record<string, number> = {};

      (attendance || []).forEach(a => {
        const service = serviceMap.get(a.service_id);
        if (service) {
          const dateKey = service.service_date;
          dateAttendance[dateKey] = (dateAttendance[dateKey] || 0) + 1;
        }
      });

      // Build chart data from service dates only
      const chartData = services
        .reduce((acc, service) => {
          const existing = acc.find(d => d.date === service.service_date);
          if (!existing) {
            acc.push({
              time: format(parseISO(service.service_date), "MMM d"),
              date: service.service_date,
              checkins: dateAttendance[service.service_date] || 0,
            });
          }
          return acc;
        }, [] as { time: string; date: string; checkins: number }[])
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data: chartData, hasData: chartData.length > 0, isTimeOfDay: false };
    },
    enabled: !!profile?.church_id && !accessLoading,
    refetchInterval: 30000
  });
}

// =================== SECTION 2: BRANCH COMPARISON ===================
export function useBranchComparison(dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["branch-comparison", profile?.church_id, dateRange, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      let branchQuery = supabase
        .from("branches")
        .select("id, name, is_main_branch")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (accessibleBranchIds !== null) {
        branchQuery = branchQuery.in("id", accessibleBranchIds);
      }

      const { data: branches } = await branchQuery;

      if (!branches?.length) return [];

      const stats = await Promise.all(branches.map(async (branch) => {
        const { count: attendance } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id)
          .gte("checked_in_at", start.toISOString())
          .lte("checked_in_at", end.toISOString());

        const { count: memberCount } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id)
          .eq("is_active", true);

        return {
          id: branch.id,
          name: branch.name.replace(" Branch", ""),
          isMain: branch.is_main_branch,
          attendance: attendance || 0,
          members: memberCount || 0
        };
      }));

      return stats.sort((a, b) => b.attendance - a.attendance);
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 3: SHORT-TERM TRENDS (Service-Driven) ===================
export function useAttendanceTrend(serviceId?: string, branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["attendance-trend", profile?.church_id, serviceId, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { trend: [], weekChange: 0, monthChange: 0, hasData: false };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { trend: [], weekChange: 0, monthChange: 0, mtdCount: 0, prevMtdCount: 0, hasData: false };
      }

      // Get last 8 weeks of services (service-driven timeline)
      const weeksAgo = subWeeks(new Date(), 8);
      
      // Fetch services in the last 8 weeks
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, name, branch_id")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(weeksAgo, "yyyy-MM-dd"))
        .lte("service_date", format(new Date(), "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: services } = await servicesQuery;

      if (!services?.length) {
        // Still calculate MTD even if no services
        const thisMonth = startOfMonth(new Date());
        let mtdQuery = supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("church_id", profile.church_id)
          .gte("checked_in_at", thisMonth.toISOString());
        
        mtdQuery = applyBranchFilter(mtdQuery, "branch_id", branchId, accessibleBranchIds);
        const { count: mtdCount } = await mtdQuery;

        return { trend: [], weekChange: 0, monthChange: 0, mtdCount: mtdCount || 0, prevMtdCount: 0, hasData: false };
      }

      const serviceIds = services.map(s => s.id);

      // Fetch attendance for these services
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id, checked_in_at, branch_id")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: attendance } = await attendanceQuery;

      // Group by service date (aggregate per service date, not per calendar day)
      const serviceMap = new Map(services.map(s => [s.id, s]));
      const dateAttendance: Record<string, { count: number; date: Date }> = {};

      (attendance || []).forEach((r) => {
        const service = serviceMap.get(r.service_id);
        if (service) {
          const dateKey = service.service_date;
          if (!dateAttendance[dateKey]) {
            dateAttendance[dateKey] = { count: 0, date: parseISO(service.service_date) };
          }
          dateAttendance[dateKey].count++;
        }
      });

      // Build trend from service dates only (no empty calendar days)
      const trend = Object.entries(dateAttendance)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8)
        .map(([_, { count, date }]) => ({ 
          week: format(date, "MMM d"),
          attendance: count 
        }));

      // Calculate week-over-week change
      const thisWeek = trend[trend.length - 1]?.attendance || 0;
      const lastWeek = trend[trend.length - 2]?.attendance || 0;
      const weekChange = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

      // MTD comparison
      const thisMonth = startOfMonth(new Date());
      const lastMonth = startOfMonth(subDays(thisMonth, 1));
      const lastMonthEnd = endOfMonth(lastMonth);
      const dayOfMonth = new Date().getDate();
      const lastMonthSameDay = subDays(lastMonthEnd, lastMonthEnd.getDate() - dayOfMonth);

      let mtdQuery = supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", thisMonth.toISOString());
      
      mtdQuery = applyBranchFilter(mtdQuery, "branch_id", branchId, accessibleBranchIds);
      const { count: mtdCount } = await mtdQuery;

      let prevMtdQuery = supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", lastMonth.toISOString())
        .lte("checked_in_at", lastMonthSameDay.toISOString());
      
      prevMtdQuery = applyBranchFilter(prevMtdQuery, "branch_id", branchId, accessibleBranchIds);
      const { count: prevMtdCount } = await prevMtdQuery;

      const monthChange = prevMtdCount ? Math.round((((mtdCount || 0) - prevMtdCount) / prevMtdCount) * 100) : 0;

      return { trend, weekChange, monthChange, mtdCount: mtdCount || 0, prevMtdCount: prevMtdCount || 0, hasData: trend.length > 0 };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 4: MEMBERS VS VISITORS ===================
export function useMemberVisitorBreakdown(branchId?: string, dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["member-visitor-breakdown", profile?.church_id, branchId, dateRange, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { members: 0, visitors: 0, visitorToReturning: 0, recentConversions: 0, totalNewVisitors: 0 };
      }

      let query = supabase
        .from("attendance")
        .select("member_id, branch_id, members!inner(membership_status)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);
      
      const { data } = await query;

      const members = (data || []).filter((r: any) => r.members?.membership_status === "member").length;
      const visitors = (data || []).filter((r: any) => 
        ["visitor", "first_timer", "new_convert"].includes(r.members?.membership_status || "")
      ).length;

      // Visitor to returning visitor ratio (90 days)
      const ninetyDaysAgo = subDays(new Date(), 90);
      let visitorQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .in("membership_status", ["visitor"])
        .gte("created_at", ninetyDaysAgo.toISOString());
      
      if (accessibleBranchIds !== null && !branchId) {
        visitorQuery = visitorQuery.in("branch_id", accessibleBranchIds);
      } else if (branchId) {
        visitorQuery = visitorQuery.eq("branch_id", branchId);
      }

      const { data: visitorData } = await visitorQuery;

      const visitorIds = (visitorData || []).map((v) => v.id);
      let returningVisitors = 0;
      
      if (visitorIds.length > 0) {
        const { data: returnData } = await supabase
          .from("attendance")
          .select("member_id")
          .in("member_id", visitorIds)
          .gte("checked_in_at", ninetyDaysAgo.toISOString());
        
        const multipleAttendance = (returnData || []).reduce((acc, r) => {
          acc[r.member_id] = (acc[r.member_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        returningVisitors = Object.values(multipleAttendance).filter((c) => c >= 2).length;
      }

      const visitorToReturning = visitorIds.length ? Math.round((returningVisitors / visitorIds.length) * 100) : 0;

      // Conversion to member (30-90 days)
      let conversionQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("membership_status", "member")
        .gte("date_joined", ninetyDaysAgo.toISOString());
      
      if (accessibleBranchIds !== null && !branchId) {
        conversionQuery = conversionQuery.in("branch_id", accessibleBranchIds);
      } else if (branchId) {
        conversionQuery = conversionQuery.eq("branch_id", branchId);
      }
      const { count: convertedCount } = await conversionQuery;

      return {
        members,
        visitors,
        visitorToReturning,
        recentConversions: convertedCount || 0,
        totalNewVisitors: visitorIds.length
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 5: RETENTION & ENGAGEMENT ===================
export function useEngagementSignals(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["engagement-signals", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { active: 0, atRisk: 0, inactive: 0, weekly: 0, monthly: 0, rare: 0 };
      }

      const now = new Date();
      const twelveWeeksAgo = subDays(now, 84);

      // Get all members
      let memberQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      memberQuery = applyBranchFilter(memberQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: allMembers } = await memberQuery;
      const memberIds = (allMembers || []).map((m) => m.id);

      if (memberIds.length === 0) return {
        active: 0, atRisk: 0, inactive: 0,
        weekly: 0, monthly: 0, rare: 0
      };

      // Get attendance in last 12 weeks
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("member_id, checked_in_at")
        .in("member_id", memberIds)
        .gte("checked_in_at", twelveWeeksAgo.toISOString());

      const attendanceByMember: Record<string, Date[]> = {};
      (attendanceData || []).forEach((r) => {
        if (!attendanceByMember[r.member_id]) attendanceByMember[r.member_id] = [];
        attendanceByMember[r.member_id].push(parseISO(r.checked_in_at));
      });

      let active = 0, atRisk = 0, inactive = 0;
      let weekly = 0, monthly = 0, rare = 0;

      memberIds.forEach((id) => {
        const dates = attendanceByMember[id] || [];
        if (dates.length === 0) {
          inactive++;
          return;
        }

        const lastAttendance = dates.sort((a, b) => b.getTime() - a.getTime())[0];
        const daysSince = Math.floor((now.getTime() - lastAttendance.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince <= 28) active++;
        else if (daysSince <= 56) atRisk++;
        else inactive++;

        // Frequency in last 12 weeks
        const attendCount = dates.length;
        const weeksWithData = 12;
        const avgPerWeek = attendCount / weeksWithData;

        if (avgPerWeek >= 0.75) weekly++;
        else if (avgPerWeek >= 0.25) monthly++;
        else rare++;
      });

      return { active, atRisk, inactive, weekly, monthly, rare };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 6: BRANCH OPERATIONS ===================
export function useBranchOperations(dateRange: DateRange = "this_week") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange(dateRange);
  const prevStart = subWeeks(start, 1);
  const prevEnd = subWeeks(end, 1);

  return useQuery({
    queryKey: ["branch-operations", profile?.church_id, dateRange, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { leaderboard: [], crossBranch: 0 };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { leaderboard: [], crossBranch: 0 };
      }

      let branchQuery = supabase
        .from("branches")
        .select("id, name, is_main_branch")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (accessibleBranchIds !== null) {
        branchQuery = branchQuery.in("id", accessibleBranchIds);
      }

      const { data: branches } = await branchQuery;

      if (!branches?.length) return { leaderboard: [], crossBranch: 0 };

      const leaderboard = await Promise.all(branches.map(async (branch) => {
        const { count: current } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id)
          .gte("checked_in_at", start.toISOString())
          .lte("checked_in_at", end.toISOString());

        const { count: previous } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id)
          .gte("checked_in_at", prevStart.toISOString())
          .lte("checked_in_at", prevEnd.toISOString());

        const change = previous ? Math.round((((current || 0) - previous) / previous) * 100) : 0;

        return {
          id: branch.id,
          name: branch.name,
          isMain: branch.is_main_branch,
          attendance: current || 0,
          change
        };
      }));

      // Cross-branch attendance
      let crossQuery = supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_cross_branch", true)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());
      
      if (accessibleBranchIds !== null) {
        crossQuery = crossQuery.in("branch_id", accessibleBranchIds);
      }
      const { count: crossBranch } = await crossQuery;

      return {
        leaderboard: leaderboard.sort((a, b) => b.attendance - a.attendance),
        crossBranch: crossBranch || 0
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 7: GROUPS SNAPSHOT ===================
export function useGroupsSnapshot(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["groups-snapshot", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { topGroups: [], noGroupPercent: 0 };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { topGroups: [], noGroupPercent: 0, noGroupCount: 0 };
      }

      // Get groups with member counts
      let groupQuery = supabase
        .from("groups")
        .select("id, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      groupQuery = applyBranchFilter(groupQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: groups } = await groupQuery;

      const topGroups = await Promise.all((groups || []).map(async (group) => {
        const { count } = await supabase
          .from("member_groups")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        return { id: group.id, name: group.name, members: count || 0 };
      }));

      // Members without groups
      let memberQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      memberQuery = applyBranchFilter(memberQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: allMembers } = await memberQuery;
      const memberIds = (allMembers || []).map((m) => m.id);

      const { data: membersWithGroups } = await supabase
        .from("member_groups")
        .select("member_id")
        .in("member_id", memberIds);

      const withGroups = new Set((membersWithGroups || []).map((m) => m.member_id));
      const noGroupCount = memberIds.filter((id) => !withGroups.has(id)).length;
      const noGroupPercent = memberIds.length ? Math.round((noGroupCount / memberIds.length) * 100) : 0;

      return {
        topGroups: topGroups.sort((a, b) => b.members - a.members).slice(0, 5),
        noGroupPercent,
        noGroupCount
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 8: DEMOGRAPHICS ===================
export function useDemographicsSnapshot(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["demographics-snapshot", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { gender: [], ageBands: [], topAreas: [] };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { gender: [], ageBands: [], topAreas: [] };
      }

      let query = supabase
        .from("members")
        .select("gender, date_of_birth, residential_area")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);
      
      const { data: members } = await query;

      // Gender distribution
      const genderCounts: Record<string, number> = {};
      (members || []).forEach((m) => {
        const g = m.gender || "unknown";
        genderCounts[g] = (genderCounts[g] || 0) + 1;
      });

      const gender = Object.entries(genderCounts).map(([name, count]) => ({
        name: name === "male" ? "Male" : name === "female" ? "Female" : "Not specified",
        value: count
      }));

      // Age bands
      const ageBands: Record<string, number> = {
        "0-17": 0, "18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "56+": 0, "Unknown": 0
      };

      (members || []).forEach((m) => {
        if (!m.date_of_birth) {
          ageBands["Unknown"]++;
          return;
        }
        const age = differenceInYears(new Date(), parseISO(m.date_of_birth));
        if (age < 18) ageBands["0-17"]++;
        else if (age <= 25) ageBands["18-25"]++;
        else if (age <= 35) ageBands["26-35"]++;
        else if (age <= 45) ageBands["36-45"]++;
        else if (age <= 55) ageBands["46-55"]++;
        else ageBands["56+"]++;
      });

      // Top residential areas
      const areaCounts: Record<string, number> = {};
      (members || []).forEach((m) => {
        if (m.residential_area) {
          areaCounts[m.residential_area] = (areaCounts[m.residential_area] || 0) + 1;
        }
      });

      const topAreas = Object.entries(areaCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([area, count]) => ({ area, count }));

      return {
        gender,
        ageBands: Object.entries(ageBands)
          .filter(([name]) => name !== "Unknown")
          .map(([name, value]) => ({ name, value })),
        topAreas
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 9: SERVICE QUALITY ===================
export function useServiceQuality(branchId?: string, dateRange: DateRange = "this_week") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["service-quality", profile?.church_id, branchId, dateRange, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { lateRate: 0, earlyRate: 0, totalCheckins: 0 };
      }

      let query = supabase
        .from("attendance")
        .select("checked_in_at, service_id, branch_id, services!inner(start_time)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);
      
      const { data } = await query;
      const records = data || [];

      if (records.length === 0) return { lateRate: 0, earlyRate: 0, totalCheckins: 0 };

      let late = 0, early = 0;
      
      records.forEach((r: any) => {
        if (!r.services?.start_time) return;
        
        const checkinTime = parseISO(r.checked_in_at);
        const [hours, mins] = r.services.start_time.split(":").map(Number);
        const serviceStart = new Date(checkinTime);
        serviceStart.setHours(hours, mins, 0, 0);

        const diffMins = (checkinTime.getTime() - serviceStart.getTime()) / (1000 * 60);
        
        if (diffMins > 15) late++;
        else if (diffMins < -15) early++;
      });

      return {
        lateRate: Math.round((late / records.length) * 100),
        earlyRate: Math.round((early / records.length) * 100),
        totalCheckins: records.length,
        lateCount: late,
        earlyCount: early
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 10: BROADCAST IMPACT ===================
export function useBroadcastImpact(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const thirtyDaysAgo = subDays(new Date(), 30);

  return useQuery({
    queryKey: ["broadcast-impact", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { sent: 0, readRate: 0 };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { sent: 0, estimatedReach: 0, readRate: 0, recentBroadcasts: [] };
      }

      let query = supabase
        .from("broadcasts")
        .select("id, title, read_count, sent_at, branch_id")
        .eq("church_id", profile.church_id)
        .gte("sent_at", thirtyDaysAgo.toISOString())
        .order("sent_at", { ascending: false });

      const { data } = await query;
      
      // Filter broadcasts based on access
      let broadcasts = data || [];
      if (accessibleBranchIds !== null && !branchId) {
        broadcasts = broadcasts.filter(b => 
          b.branch_id === null || accessibleBranchIds.includes(b.branch_id)
        );
      } else if (branchId) {
        broadcasts = broadcasts.filter(b => b.branch_id === branchId || b.branch_id === null);
      }

      // Estimate reach based on member count
      let memberQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      memberQuery = applyBranchFilter(memberQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { count: memberCount } = await memberQuery;
      
      const totalReads = broadcasts.reduce((sum, b) => sum + (b.read_count || 0), 0);
      const estimatedReach = memberCount || 0;
      const readRate = broadcasts.length && estimatedReach 
        ? Math.round((totalReads / (broadcasts.length * estimatedReach)) * 100) 
        : 0;

      return {
        sent: broadcasts.length,
        estimatedReach,
        readRate: Math.min(readRate, 100),
        recentBroadcasts: broadcasts.slice(0, 5)
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SECTION 11: DATA HEALTH ===================
export function useDataHealth(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["data-health", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { missingPhone: 0, missingEmail: 0, missingDob: 0, pendingApprovals: 0, duplicates: 0 };
      }

      const buildQuery = (field: string, isNull: boolean) => {
        let q = supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("church_id", profile.church_id)
          .eq("is_active", true);
        
        q = applyBranchFilter(q, "branch_id", branchId, accessibleBranchIds);
        if (isNull) q = q.is(field, null);
        
        return q;
      };

      let pendingQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("approval_status", "pending");
      
      pendingQuery = applyBranchFilter(pendingQuery, "branch_id", branchId, accessibleBranchIds);

      const [noPhone, noEmail, noDob, pendingApproval] = await Promise.all([
        buildQuery("phone", true),
        buildQuery("email", true),
        buildQuery("date_of_birth", true),
        pendingQuery
      ]);

      // Duplicate detection (same phone or email)
      let phoneQuery = supabase
        .from("members")
        .select("phone")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .not("phone", "is", null);
      
      phoneQuery = applyBranchFilter(phoneQuery, "branch_id", branchId, accessibleBranchIds);
      const { data: phoneData } = await phoneQuery;

      const phoneSet = new Set<string>();
      let duplicates = 0;
      (phoneData || []).forEach((m) => {
        if (phoneSet.has(m.phone!)) duplicates++;
        else phoneSet.add(m.phone!);
      });

      return {
        missingPhone: noPhone.count || 0,
        missingEmail: noEmail.count || 0,
        missingDob: noDob.count || 0,
        pendingApprovals: pendingApproval.count || 0,
        duplicates
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== ACTIONABLE LISTS ===================
export function useFollowUpList(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const { start, end } = getDateRange("today");

  return useQuery({
    queryKey: ["followup-list", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      let attendanceQuery = supabase
        .from("attendance")
        .select("member_id, branch_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: attendance } = await attendanceQuery;

      const memberIds = [...new Set((attendance || []).map((a) => a.member_id))];
      if (memberIds.length === 0) return [];

      let query = supabase
        .from("members")
        .select("id, full_name, phone, membership_status, branch_id, branches(name)")
        .in("id", memberIds)
        .in("membership_status", ["first_timer", "visitor"]);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data } = await query;

      return (data || []).slice(0, 10).map((m: any) => ({
        id: m.id,
        name: m.full_name,
        phone: m.phone,
        status: m.membership_status,
        branch: m.branches?.name
      }));
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

export function useLikelyAbsentees(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const fourWeeksAgo = subDays(new Date(), 28);
  const { start } = getDateRange("today");

  return useQuery({
    queryKey: ["likely-absentees", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      // Get past 4 weeks attendance
      let pastQuery = supabase
        .from("attendance")
        .select("member_id, branch_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", fourWeeksAgo.toISOString())
        .lt("checked_in_at", start.toISOString());

      pastQuery = applyBranchFilter(pastQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: pastAttendance } = await pastQuery;

      const attendanceCount: Record<string, number> = {};
      (pastAttendance || []).forEach((r) => {
        attendanceCount[r.member_id] = (attendanceCount[r.member_id] || 0) + 1;
      });

      const regularIds = Object.entries(attendanceCount)
        .filter(([, count]) => count >= 2)
        .map(([id]) => id);

      if (regularIds.length === 0) return [];

      // Get today's attendance
      let todayQuery = supabase
        .from("attendance")
        .select("member_id, branch_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString());

      todayQuery = applyBranchFilter(todayQuery, "branch_id", branchId, accessibleBranchIds);
      
      const { data: todayAttendance } = await todayQuery;

      const todaySet = new Set((todayAttendance || []).map((r) => r.member_id));
      const absentIds = regularIds.filter((id) => !todaySet.has(id)).slice(0, 10);

      if (absentIds.length === 0) return [];

      let query = supabase
        .from("members")
        .select("id, full_name, phone, branches(name)")
        .in("id", absentIds)
        .eq("is_active", true);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data } = await query;

      return (data || []).map((m: any) => ({
        id: m.id,
        name: m.full_name,
        phone: m.phone,
        branch: m.branches?.name,
        usualAttendance: attendanceCount[m.id] || 0
      }));
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// =================== SERVICES ===================
export function useTodayServices(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["today-services", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("service_date", today)
        .eq("is_active", true)
        .order("start_time");

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

export function useRecentServices(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const weekAgo = subDays(new Date(), 7);

  return useQuery({
    queryKey: ["recent-services", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(weekAgo, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(10);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}
