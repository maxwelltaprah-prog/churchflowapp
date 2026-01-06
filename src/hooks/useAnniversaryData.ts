import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { startOfDay, endOfDay, addDays, subDays, format, parseISO, getMonth, getDate, differenceInYears } from "date-fns";

export interface AnniversaryMember {
  id: string;
  full_name: string;
  date_joined: string;
  phone: string | null;
  photo_url: string | null;
  branch_name: string | null;
  anniversary_date: string; // This year's anniversary date
  years: number; // Number of years since joining
  is_past: boolean;
}

export function useAnniversaryData(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["anniversaries", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { pastWeek: [], upcoming: [] };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { pastWeek: [], upcoming: [] };
      }

      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const weekAhead = addDays(today, 7);
      const currentYear = today.getFullYear();

      // Fetch all members with date_joined
      let query = supabase
        .from("members")
        .select("id, full_name, date_joined, phone, photo_url, branch_id, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .not("date_joined", "is", null);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data: members, error } = await query;
      if (error) throw error;

      const pastWeek: AnniversaryMember[] = [];
      const upcoming: AnniversaryMember[] = [];

      (members || []).forEach((member: any) => {
        if (!member.date_joined) return;

        const joinDate = parseISO(member.date_joined);
        const joinMonth = getMonth(joinDate);
        const joinDay = getDate(joinDate);

        // Calculate this year's anniversary
        let anniversaryThisYear = new Date(currentYear, joinMonth, joinDay);
        
        // Calculate years since joining
        const years = differenceInYears(anniversaryThisYear, joinDate);
        
        // Skip if this is the same year they joined (no anniversary yet)
        if (years < 1) return;

        const anniversaryStart = startOfDay(anniversaryThisYear);

        // Check if anniversary falls within past week (not including today)
        if (anniversaryStart >= weekAgo && anniversaryStart < today) {
          pastWeek.push({
            id: member.id,
            full_name: member.full_name,
            date_joined: member.date_joined,
            phone: member.phone,
            photo_url: member.photo_url,
            branch_name: member.branches?.name || null,
            anniversary_date: format(anniversaryThisYear, "yyyy-MM-dd"),
            years,
            is_past: true
          });
        }
        // Check if anniversary falls within today or next 7 days
        else if (anniversaryStart >= today && anniversaryStart <= weekAhead) {
          upcoming.push({
            id: member.id,
            full_name: member.full_name,
            date_joined: member.date_joined,
            phone: member.phone,
            photo_url: member.photo_url,
            branch_name: member.branches?.name || null,
            anniversary_date: format(anniversaryThisYear, "yyyy-MM-dd"),
            years,
            is_past: false
          });
        }
      });

      // Sort by anniversary date
      pastWeek.sort((a, b) => b.anniversary_date.localeCompare(a.anniversary_date)); // Most recent first
      upcoming.sort((a, b) => a.anniversary_date.localeCompare(b.anniversary_date)); // Soonest first

      return { pastWeek, upcoming };
    },
    enabled: !!profile?.church_id && !accessLoading,
  });
}
