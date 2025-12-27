import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

// =================== SECTION 1: TODAY'S SNAPSHOT KPIs ===================
export function useTodayKPIs(branchId?: string, serviceId?: string, dateRange: DateRange = "today") {
  const { profile, roles } = useAuth();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["dashboard-kpis", profile?.church_id, branchId, serviceId, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Build attendance query
      let query = supabase
        .from("attendance")
        .select("*, members!inner(membership_status, created_at)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      if (branchId) query = query.eq("branch_id", branchId);
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
      if (branchId) prevQuery = prevQuery.eq("branch_id", branchId);
      
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
    enabled: !!profile?.church_id,
    refetchInterval: 30000
  });
}

// =================== SECTION 2: TODAY'S FLOW (Check-in Trend) ===================
export function useCheckinTrend(branchId?: string, serviceId?: string, dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["checkin-trend", profile?.church_id, branchId, serviceId, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("attendance")
        .select("checked_in_at")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString())
        .order("checked_in_at");

      if (branchId) query = query.eq("branch_id", branchId);
      if (serviceId) query = query.eq("service_id", serviceId);

      const { data, error } = await query;
      if (error) throw error;

      // Group by 15-min intervals for today, hourly for longer periods
      const interval = dateRange === "today" ? 15 : 60;
      const buckets: Record<string, number> = {};
      
      for (let h = 6; h <= 22; h++) {
        if (interval === 15) {
          ["00", "15", "30", "45"].forEach(m => {
            buckets[`${h.toString().padStart(2, "0")}:${m}`] = 0;
          });
        } else {
          buckets[`${h.toString().padStart(2, "0")}:00`] = 0;
        }
      }

      (data || []).forEach((r) => {
        const dt = parseISO(r.checked_in_at);
        const h = dt.getHours().toString().padStart(2, "0");
        const m = interval === 15 
          ? (Math.floor(dt.getMinutes() / 15) * 15).toString().padStart(2, "0")
          : "00";
        const key = `${h}:${m}`;
        if (buckets[key] !== undefined) buckets[key]++;
      });

      return Object.entries(buckets).map(([time, count]) => ({ time, checkins: count }));
    },
    enabled: !!profile?.church_id,
    refetchInterval: 30000
  });
}

// =================== SECTION 2: BRANCH COMPARISON ===================
export function useBranchComparison(dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["branch-comparison", profile?.church_id, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, is_main_branch")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

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
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 3: SHORT-TERM TRENDS ===================
export function useAttendanceTrend(serviceId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["attendance-trend", profile?.church_id, serviceId],
    queryFn: async () => {
      if (!profile?.church_id) return { trend: [], weekChange: 0, monthChange: 0 };

      // Get last 8 weeks of attendance
      const weeksAgo = subWeeks(new Date(), 8);
      
      let query = supabase
        .from("attendance")
        .select("checked_in_at, service_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", weeksAgo.toISOString())
        .order("checked_in_at");

      const { data } = await query;

      // Group by week
      const weeklyData: Record<string, number> = {};
      (data || []).forEach((r) => {
        const week = format(parseISO(r.checked_in_at), "MMM d");
        weeklyData[week] = (weeklyData[week] || 0) + 1;
      });

      const trend = Object.entries(weeklyData)
        .slice(-8)
        .map(([week, count]) => ({ week, attendance: count }));

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

      const { count: mtdCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", thisMonth.toISOString());

      const { count: prevMtdCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", lastMonth.toISOString())
        .lte("checked_in_at", lastMonthSameDay.toISOString());

      const monthChange = prevMtdCount ? Math.round((((mtdCount || 0) - prevMtdCount) / prevMtdCount) * 100) : 0;

      return { trend, weekChange, monthChange, mtdCount: mtdCount || 0, prevMtdCount: prevMtdCount || 0 };
    },
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 4: MEMBERS VS VISITORS ===================
export function useMemberVisitorBreakdown(branchId?: string, dateRange: DateRange = "today") {
  const { profile } = useAuth();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["member-visitor-breakdown", profile?.church_id, branchId, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      let query = supabase
        .from("attendance")
        .select("member_id, members!inner(membership_status)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      if (branchId) query = query.eq("branch_id", branchId);
      
      const { data } = await query;

      const members = (data || []).filter((r: any) => r.members?.membership_status === "member").length;
      const visitors = (data || []).filter((r: any) => 
        ["visitor", "first_timer", "new_convert"].includes(r.members?.membership_status || "")
      ).length;

      // Visitor to returning visitor ratio (90 days)
      const ninetyDaysAgo = subDays(new Date(), 90);
      const { data: visitorData } = await supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .in("membership_status", ["visitor"])
        .gte("created_at", ninetyDaysAgo.toISOString());

      const visitorIds = (visitorData || []).map((v) => v.id);
      let returningVisitors = 0;
      
      if (visitorIds.length > 0) {
        const { data: returnData } = await supabase
          .from("attendance")
          .select("member_id")
          .in("member_id", visitorIds)
          .gte("checked_in_at", ninetyDaysAgo.toISOString());
        
        const attendedSet = new Set((returnData || []).map((r) => r.member_id));
        const multipleAttendance = (returnData || []).reduce((acc, r) => {
          acc[r.member_id] = (acc[r.member_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        returningVisitors = Object.values(multipleAttendance).filter((c) => c >= 2).length;
      }

      const visitorToReturning = visitorIds.length ? Math.round((returningVisitors / visitorIds.length) * 100) : 0;

      // Conversion to member (30-90 days)
      const { count: convertedCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("membership_status", "member")
        .gte("date_joined", ninetyDaysAgo.toISOString());

      return {
        members,
        visitors,
        visitorToReturning,
        recentConversions: convertedCount || 0,
        totalNewVisitors: visitorIds.length
      };
    },
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 5: RETENTION & ENGAGEMENT ===================
export function useEngagementSignals(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["engagement-signals", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const now = new Date();
      const fourWeeksAgo = subDays(now, 28);
      const eightWeeksAgo = subDays(now, 56);
      const twelveWeeksAgo = subDays(now, 84);

      // Get all members
      let memberQuery = supabase
        .from("members")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      if (branchId) memberQuery = memberQuery.eq("branch_id", branchId);
      
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
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 6: BRANCH OPERATIONS ===================
export function useBranchOperations(dateRange: DateRange = "this_week") {
  const { profile } = useAuth();
  const { start, end } = getDateRange(dateRange);
  const prevStart = subWeeks(start, 1);
  const prevEnd = subWeeks(end, 1);

  return useQuery({
    queryKey: ["branch-operations", profile?.church_id, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return { leaderboard: [], crossBranch: 0 };

      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, is_main_branch")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

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
      const { count: crossBranch } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_cross_branch", true)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      return {
        leaderboard: leaderboard.sort((a, b) => b.attendance - a.attendance),
        crossBranch: crossBranch || 0
      };
    },
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 7: GROUPS SNAPSHOT ===================
export function useGroupsSnapshot(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["groups-snapshot", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return { topGroups: [], noGroupPercent: 0 };

      // Get groups with member counts
      let groupQuery = supabase
        .from("groups")
        .select("id, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (branchId) groupQuery = groupQuery.eq("branch_id", branchId);
      
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
      
      if (branchId) memberQuery = memberQuery.eq("branch_id", branchId);
      
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
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 8: DEMOGRAPHICS ===================
export function useDemographicsSnapshot(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["demographics-snapshot", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return { gender: [], ageBands: [], topAreas: [] };

      let query = supabase
        .from("members")
        .select("gender, date_of_birth, residential_area")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (branchId) query = query.eq("branch_id", branchId);
      
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
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 9: SERVICE QUALITY ===================
export function useServiceQuality(branchId?: string, dateRange: DateRange = "this_week") {
  const { profile } = useAuth();
  const { start, end } = getDateRange(dateRange);

  return useQuery({
    queryKey: ["service-quality", profile?.church_id, branchId, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      let query = supabase
        .from("attendance")
        .select("checked_in_at, service_id, services!inner(start_time)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      if (branchId) query = query.eq("branch_id", branchId);
      
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
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 10: BROADCAST IMPACT ===================
export function useBroadcastImpact(branchId?: string) {
  const { profile } = useAuth();
  const thirtyDaysAgo = subDays(new Date(), 30);

  return useQuery({
    queryKey: ["broadcast-impact", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return { sent: 0, readRate: 0 };

      let query = supabase
        .from("broadcasts")
        .select("id, title, read_count, sent_at")
        .eq("church_id", profile.church_id)
        .gte("sent_at", thirtyDaysAgo.toISOString())
        .order("sent_at", { ascending: false });

      if (branchId) query = query.eq("branch_id", branchId);
      
      const { data } = await query;
      const broadcasts = data || [];

      // Estimate reach based on member count
      let memberQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      if (branchId) memberQuery = memberQuery.eq("branch_id", branchId);
      
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
    enabled: !!profile?.church_id
  });
}

// =================== SECTION 11: DATA HEALTH ===================
export function useDataHealth(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["data-health", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const buildQuery = (field: string, isNull: boolean) => {
        let q = supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("church_id", profile.church_id)
          .eq("is_active", true);
        
        if (branchId) q = q.eq("branch_id", branchId);
        if (isNull) q = q.is(field, null);
        
        return q;
      };

      const [noPhone, noEmail, noDob, pendingApproval] = await Promise.all([
        buildQuery("phone", true),
        buildQuery("email", true),
        buildQuery("date_of_birth", true),
        supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("church_id", profile.church_id)
          .eq("approval_status", "pending")
      ]);

      // Duplicate detection (same phone or email)
      const { data: phoneData } = await supabase
        .from("members")
        .select("phone")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .not("phone", "is", null);

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
    enabled: !!profile?.church_id
  });
}

// =================== ACTIONABLE LISTS ===================
export function useFollowUpList(branchId?: string) {
  const { profile } = useAuth();
  const today = new Date();
  const { start, end } = getDateRange("today");

  return useQuery({
    queryKey: ["followup-list", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data: attendance } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString())
        .lte("checked_in_at", end.toISOString());

      const memberIds = [...new Set((attendance || []).map((a) => a.member_id))];
      if (memberIds.length === 0) return [];

      let query = supabase
        .from("members")
        .select("id, full_name, phone, membership_status, branch_id, branches(name)")
        .in("id", memberIds)
        .in("membership_status", ["first_timer", "visitor"]);

      if (branchId) query = query.eq("branch_id", branchId);

      const { data } = await query;

      return (data || []).slice(0, 10).map((m: any) => ({
        id: m.id,
        name: m.full_name,
        phone: m.phone,
        status: m.membership_status,
        branch: m.branches?.name
      }));
    },
    enabled: !!profile?.church_id
  });
}

export function useLikelyAbsentees(branchId?: string) {
  const { profile } = useAuth();
  const fourWeeksAgo = subDays(new Date(), 28);
  const { start } = getDateRange("today");

  return useQuery({
    queryKey: ["likely-absentees", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get past 4 weeks attendance
      const { data: pastAttendance } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", fourWeeksAgo.toISOString())
        .lt("checked_in_at", start.toISOString());

      const attendanceCount: Record<string, number> = {};
      (pastAttendance || []).forEach((r) => {
        attendanceCount[r.member_id] = (attendanceCount[r.member_id] || 0) + 1;
      });

      const regularIds = Object.entries(attendanceCount)
        .filter(([, count]) => count >= 2)
        .map(([id]) => id);

      if (regularIds.length === 0) return [];

      // Get today's attendance
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start.toISOString());

      const todaySet = new Set((todayAttendance || []).map((r) => r.member_id));
      const absentIds = regularIds.filter((id) => !todaySet.has(id)).slice(0, 10);

      if (absentIds.length === 0) return [];

      let query = supabase
        .from("members")
        .select("id, full_name, phone, branches(name)")
        .in("id", absentIds)
        .eq("is_active", true);

      if (branchId) query = query.eq("branch_id", branchId);

      const { data } = await query;

      return (data || []).map((m: any) => ({
        id: m.id,
        name: m.full_name,
        phone: m.phone,
        branch: m.branches?.name,
        usualAttendance: attendanceCount[m.id] || 0
      }));
    },
    enabled: !!profile?.church_id
  });
}

// =================== SERVICES ===================
export function useTodayServices(branchId?: string) {
  const { profile } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["today-services", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("service_date", today)
        .eq("is_active", true)
        .order("start_time");

      if (branchId) query = query.eq("branch_id", branchId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id
  });
}

export function useRecentServices(branchId?: string) {
  const { profile } = useAuth();
  const weekAgo = subDays(new Date(), 7);

  return useQuery({
    queryKey: ["recent-services", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(weekAgo, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(10);

      if (branchId) query = query.eq("branch_id", branchId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id
  });
}
