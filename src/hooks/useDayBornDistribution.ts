import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";

export interface DayBornCount {
  day: string;
  label: string;
  count: number;
  color: string;
}

const DAY_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "sunday", label: "Sunday", color: "hsl(var(--kpi-orange))" },
  { key: "monday", label: "Monday", color: "hsl(var(--kpi-blue))" },
  { key: "tuesday", label: "Tuesday", color: "hsl(var(--kpi-teal))" },
  { key: "wednesday", label: "Wednesday", color: "hsl(var(--kpi-green))" },
  { key: "thursday", label: "Thursday", color: "hsl(var(--kpi-purple))" },
  { key: "friday", label: "Friday", color: "hsl(var(--kpi-pink))" },
  { key: "saturday", label: "Saturday", color: "hsl(var(--kpi-amber))" },
];

export function useDayBornDistribution(branchId?: string, serviceIds?: string[]) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["day-born-distribution", profile?.church_id, branchId, serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      // If serviceIds provided, get members who checked in to those services
      if (serviceIds && serviceIds.length > 0) {
        // Get unique member IDs who checked in to the selected services
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("member_id")
          .eq("church_id", profile.church_id)
          .in("service_id", serviceIds);

        if (attendanceError) throw attendanceError;

        const uniqueMemberIds = [...new Set(attendanceData?.map(a => a.member_id) || [])];

        if (uniqueMemberIds.length === 0) {
          return DAY_CONFIG.map(d => ({ day: d.key, label: d.label, count: 0, color: d.color }));
        }

        // Fetch day_born for those members
        let query = supabase
          .from("members")
          .select("id, day_born")
          .eq("church_id", profile.church_id)
          .in("id", uniqueMemberIds)
          .not("day_born", "is", null);

        query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

        const { data: members, error } = await query;
        if (error) throw error;

        // Count by day
        const counts: Record<string, number> = {};
        DAY_CONFIG.forEach(d => counts[d.key] = 0);

        (members || []).forEach((m: any) => {
          if (m.day_born && counts[m.day_born] !== undefined) {
            counts[m.day_born]++;
          }
        });

        return DAY_CONFIG.map(d => ({
          day: d.key,
          label: d.label,
          count: counts[d.key],
          color: d.color,
        }));
      }

      // Default: count all active members by day_born
      let query = supabase
        .from("members")
        .select("id, day_born")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .not("day_born", "is", null);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data: members, error } = await query;
      if (error) throw error;

      const counts: Record<string, number> = {};
      DAY_CONFIG.forEach(d => counts[d.key] = 0);

      (members || []).forEach((m: any) => {
        if (m.day_born && counts[m.day_born] !== undefined) {
          counts[m.day_born]++;
        }
      });

      return DAY_CONFIG.map(d => ({
        day: d.key,
        label: d.label,
        count: counts[d.key],
        color: d.color,
      }));
    },
    enabled: !!profile?.church_id && !accessLoading,
  });
}
