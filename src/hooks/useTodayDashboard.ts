import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, subDays, format, parseISO } from "date-fns";

// Get today's date range
const getTodayRange = () => {
  const today = new Date();
  return {
    start: startOfDay(today).toISOString(),
    end: endOfDay(today).toISOString(),
    dateString: format(today, "yyyy-MM-dd")
  };
};

// Today's KPI stats
export function useTodayKPIs(branchId?: string, serviceId?: string) {
  const { profile } = useAuth();
  const { start, end } = getTodayRange();

  return useQuery({
    queryKey: ["today-kpis", profile?.church_id, branchId, serviceId],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Build query based on filters
      let query = supabase
        .from("attendance")
        .select("*, members!inner(membership_status, created_at)")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start)
        .lte("checked_in_at", end);

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }
      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data: attendanceRecords, error } = await query;
      if (error) throw error;

      const records = attendanceRecords || [];

      // Calculate KPIs
      const totalAttendance = records.length;
      
      const visitorsToday = records.filter(
        (r: any) => r.members?.membership_status === "visitor"
      ).length;

      const firstTimersToday = records.filter(
        (r: any) => r.members?.membership_status === "first_timer"
      ).length;

      // Returning visitors: visitors who have attended before today
      const visitorMemberIds = records
        .filter((r: any) => r.members?.membership_status === "visitor")
        .map((r: any) => r.member_id);

      let returningVisitorsToday = 0;
      if (visitorMemberIds.length > 0) {
        const { count } = await supabase
          .from("attendance")
          .select("member_id", { count: "exact", head: true })
          .eq("church_id", profile.church_id)
          .in("member_id", visitorMemberIds)
          .lt("checked_in_at", start);
        
        returningVisitorsToday = count || 0;
      }

      // Late arrivals: checked in after 30 mins of first check-in
      let lateArrivals = 0;
      if (records.length > 0) {
        const sortedCheckins = [...records].sort(
          (a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
        );
        const firstCheckin = new Date(sortedCheckins[0].checked_in_at);
        const lateThreshold = new Date(firstCheckin.getTime() + 30 * 60 * 1000);
        lateArrivals = records.filter(
          (r) => new Date(r.checked_in_at) > lateThreshold
        ).length;
      }

      return {
        totalAttendance,
        visitorsToday,
        firstTimersToday,
        returningVisitorsToday,
        lateArrivals
      };
    },
    enabled: !!profile?.church_id,
    refetchInterval: 30000
  });
}

// Today's check-in trend (hourly)
export function useTodayCheckinTrend(branchId?: string, serviceId?: string) {
  const { profile } = useAuth();
  const { start, end } = getTodayRange();

  return useQuery({
    queryKey: ["today-checkin-trend", profile?.church_id, branchId, serviceId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("attendance")
        .select("checked_in_at")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start)
        .lte("checked_in_at", end)
        .order("checked_in_at");

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }
      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by hour
      const hourlyData: Record<string, number> = {};
      for (let h = 6; h <= 22; h++) {
        const hour = h.toString().padStart(2, "0");
        hourlyData[`${hour}:00`] = 0;
      }

      (data || []).forEach((record) => {
        const hour = format(parseISO(record.checked_in_at), "HH:00");
        if (hourlyData[hour] !== undefined) {
          hourlyData[hour]++;
        }
      });

      return Object.entries(hourlyData).map(([time, count]) => ({
        time,
        checkins: count
      }));
    },
    enabled: !!profile?.church_id,
    refetchInterval: 30000
  });
}

// Branch comparison for today
export function useTodayBranchComparison() {
  const { profile } = useAuth();
  const { start, end } = getTodayRange();

  return useQuery({
    queryKey: ["today-branch-comparison", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id, name, is_main_branch")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (branchError) throw branchError;
      if (!branches?.length) return [];

      const branchStats = await Promise.all(
        branches.map(async (branch) => {
          const { count: attendance } = await supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .gte("checked_in_at", start)
            .lte("checked_in_at", end);

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
            members: memberCount || 0,
            attendanceRate: memberCount ? Math.round(((attendance || 0) / memberCount) * 100) : 0
          };
        })
      );

      return branchStats.sort((a, b) => b.attendance - a.attendance);
    },
    enabled: !!profile?.church_id
  });
}

// Today's services
export function useTodayServices(branchId?: string) {
  const { profile } = useAuth();
  const { dateString } = getTodayRange();

  return useQuery({
    queryKey: ["today-services", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("service_date", dateString)
        .eq("is_active", true)
        .order("start_time");

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    enabled: !!profile?.church_id
  });
}

// New people to follow up (first-timers and new visitors from today)
export function useFollowUpList(branchId?: string) {
  const { profile } = useAuth();
  const { start, end } = getTodayRange();

  return useQuery({
    queryKey: ["today-followups", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get today's attendance for visitors/first-timers
      const { data: attendanceData, error } = await supabase
        .from("attendance")
        .select("id, checked_in_at, member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start)
        .lte("checked_in_at", end);

      if (error) throw error;
      if (!attendanceData?.length) return [];

      const memberIds = [...new Set(attendanceData.map(a => a.member_id))];

      // Get member details for visitors/first-timers
      const { data: members } = await supabase
        .from("members")
        .select("id, full_name, phone, membership_status, branch_id, branches(name)")
        .in("id", memberIds)
        .in("membership_status", ["first_timer", "visitor"]);

      if (!members?.length) return [];

      const result = members.map((m: any) => {
        const attendance = attendanceData.find(a => a.member_id === m.id);
        return {
          id: m.id,
          name: m.full_name,
          phone: m.phone,
          status: m.membership_status,
          branch: m.branches?.name,
          checkedInAt: attendance?.checked_in_at
        };
      });

      // Filter by branch if specified
      if (branchId) {
        return result.filter((m: any) => 
          members.find((mem: any) => mem.id === m.id && mem.branch_id === branchId)
        ).slice(0, 10);
      }

      return result.slice(0, 10);
    },
    enabled: !!profile?.church_id
  });
}

// Likely absentees (members who usually attend but haven't today)
export function useLikelyAbsentees(branchId?: string) {
  const { profile } = useAuth();
  const { start } = getTodayRange();

  return useQuery({
    queryKey: ["likely-absentees", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const today = new Date();
      const fourWeeksAgo = subDays(today, 28);

      // Get past attendance in last 4 weeks
      const { data: pastAttendance } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", fourWeeksAgo.toISOString())
        .lt("checked_in_at", start);
      
      // Count attendance frequency
      const attendanceCount: Record<string, number> = {};
      (pastAttendance || []).forEach((record) => {
        attendanceCount[record.member_id] = (attendanceCount[record.member_id] || 0) + 1;
      });

      // Get members who attended 2+ times in past 4 weeks
      const regularMemberIds = Object.entries(attendanceCount)
        .filter(([_, count]) => count >= 2)
        .map(([id]) => id);

      if (regularMemberIds.length === 0) return [];

      // Get today's attendance
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("member_id")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", start);

      const todayMemberIds = new Set((todayAttendance || []).map((r) => r.member_id));

      // Find absentees
      const absentMemberIds = regularMemberIds
        .filter((id) => !todayMemberIds.has(id))
        .slice(0, 10);

      if (absentMemberIds.length === 0) return [];

      // Get member details
      let memberQuery = supabase
        .from("members")
        .select("id, full_name, phone, branch_id, branches(name)")
        .in("id", absentMemberIds)
        .eq("is_active", true);

      if (branchId) {
        memberQuery = memberQuery.eq("branch_id", branchId);
      }

      const { data: members } = await memberQuery;

      return (members || []).map((m: any) => ({
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

// Data quality flags
export function useDataQualityFlags(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["data-quality-flags", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const flags: Array<{
        type: "warning" | "info";
        title: string;
        description: string;
        count?: number;
      }> = [];

      // Members without phone - base query
      const noPhoneQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .is("phone", null);

      const { count: noPhoneCount } = branchId 
        ? await noPhoneQuery.eq("branch_id", branchId)
        : await noPhoneQuery;

      if (noPhoneCount && noPhoneCount > 0) {
        flags.push({
          type: "warning",
          title: "Members without phone numbers",
          description: `${noPhoneCount} members have no phone number`,
          count: noPhoneCount
        });
      }

      // Pending approvals
      const pendingQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("approval_status", "pending");

      const { count: pendingCount } = branchId
        ? await pendingQuery.eq("branch_id", branchId)
        : await pendingQuery;

      if (pendingCount && pendingCount > 0) {
        flags.push({
          type: "info",
          title: "Pending member approvals",
          description: `${pendingCount} members awaiting approval`,
          count: pendingCount
        });
      }

      // Members without date of birth
      const noDobQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .is("date_of_birth", null);

      const { count: noDobCount } = branchId
        ? await noDobQuery.eq("branch_id", branchId)
        : await noDobQuery;

      if (noDobCount && noDobCount > 5) {
        flags.push({
          type: "info",
          title: "Incomplete member profiles",
          description: `${noDobCount} members missing date of birth`,
          count: noDobCount
        });
      }

      return flags;
    },
    enabled: !!profile?.church_id
  });
}
