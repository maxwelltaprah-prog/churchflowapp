import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, subMonths, format, startOfWeek, subWeeks, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

export function useAttendanceTrends(period: "week" | "month" | "year" = "month") {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["attendance-trends", profile?.church_id, period],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let startDate: Date;
      let intervals: Date[];
      let dateFormat: string;

      const now = new Date();

      if (period === "week") {
        startDate = subWeeks(now, 4);
        intervals = eachDayOfInterval({ start: startDate, end: now });
        dateFormat = "EEE";
      } else if (period === "month") {
        startDate = subWeeks(now, 12);
        intervals = eachWeekOfInterval({ start: startDate, end: now });
        dateFormat = "MMM d";
      } else {
        startDate = subMonths(now, 12);
        intervals = eachMonthOfInterval({ start: startDate, end: now });
        dateFormat = "MMM";
      }

      const { data: attendance } = await supabase
        .from("attendance")
        .select("checked_in_at")
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", startDate.toISOString());

      const attendanceByPeriod = intervals.map((date, index) => {
        const nextDate = intervals[index + 1] || now;
        const count = attendance?.filter(a => {
          const checkinDate = new Date(a.checked_in_at);
          return checkinDate >= date && checkinDate < nextDate;
        }).length || 0;

        return {
          date: format(date, dateFormat),
          attendance: count,
        };
      });

      return attendanceByPeriod;
    },
    enabled: !!profile?.church_id,
  });
}

export function useMemberGrowth() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["member-growth", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const now = new Date();
      const startDate = subMonths(now, 6);
      const intervals = eachMonthOfInterval({ start: startDate, end: now });

      const { data: members } = await supabase
        .from("members")
        .select("created_at")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      let cumulativeCount = 0;
      const membersByMonth = intervals.map((date, index) => {
        const nextDate = intervals[index + 1] || now;
        const newMembers = members?.filter(m => {
          const createdDate = new Date(m.created_at);
          return createdDate >= date && createdDate < nextDate;
        }).length || 0;
        
        cumulativeCount += newMembers;

        return {
          month: format(date, "MMM"),
          members: cumulativeCount,
          newMembers,
        };
      });

      return membersByMonth;
    },
    enabled: !!profile?.church_id,
  });
}

export function useBranchComparison() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["branch-comparison", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data: branches } = await supabase
        .from("branches")
        .select("id, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (!branches) return [];

      const branchStats = await Promise.all(
        branches.map(async (branch) => {
          const { count: memberCount } = await supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .eq("is_active", true);

          const thirtyDaysAgo = subMonths(new Date(), 1);
          const { count: attendanceCount } = await supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .gte("checked_in_at", thirtyDaysAgo.toISOString());

          return {
            name: branch.name.replace(" Branch", ""),
            members: memberCount || 0,
            attendance: attendanceCount || 0,
          };
        })
      );

      return branchStats;
    },
    enabled: !!profile?.church_id,
  });
}

export function useServiceAttendance() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["service-attendance", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const thirtyDaysAgo = subMonths(new Date(), 1);

      const { data: services } = await supabase
        .from("services")
        .select(`
          id,
          name,
          service_date,
          attendance:attendance(count)
        `)
        .eq("church_id", profile.church_id)
        .gte("service_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("service_date", { ascending: true })
        .limit(10);

      return services?.map(s => ({
        name: `${s.name} (${format(new Date(s.service_date), "MMM d")})`,
        attendance: (s.attendance as any)?.[0]?.count || 0,
      })) || [];
    },
    enabled: !!profile?.church_id,
  });
}
