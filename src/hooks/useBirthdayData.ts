import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { startOfDay, endOfDay, addDays, subDays, format, parseISO, getMonth, getDate } from "date-fns";

export interface BirthdayMember {
  id: string;
  full_name: string;
  date_of_birth: string;
  phone: string | null;
  photo_url: string | null;
  branch_name: string | null;
  birthday_date: string; // This year's birthday date
  is_past: boolean;
  day_born: string | null;
}

export function useBirthdayData(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["birthdays", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return { pastWeek: [], upcoming: [] };

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { pastWeek: [], upcoming: [] };
      }

      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const weekAhead = addDays(today, 7);
      const currentYear = today.getFullYear();

      // Fetch all members with date_of_birth
      let query = supabase
        .from("members")
        .select("id, full_name, date_of_birth, day_born, phone, photo_url, branch_id, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .not("date_of_birth", "is", null);

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data: members, error } = await query;
      if (error) throw error;

      const pastWeek: BirthdayMember[] = [];
      const upcoming: BirthdayMember[] = [];

      (members || []).forEach((member: any) => {
        if (!member.date_of_birth) return;

        const dob = parseISO(member.date_of_birth);
        const dobMonth = getMonth(dob);
        const dobDay = getDate(dob);

        // Calculate this year's birthday
        let birthdayThisYear = new Date(currentYear, dobMonth, dobDay);
        
        // If birthday already passed this year and we're checking past week,
        // we still use this year's date. If it's way in the past, skip.
        const birthdayStart = startOfDay(birthdayThisYear);
        const birthdayEnd = endOfDay(birthdayThisYear);

        // Check if birthday falls within past week (not including today)
        if (birthdayStart >= weekAgo && birthdayStart < today) {
          pastWeek.push({
            id: member.id,
            full_name: member.full_name,
            date_of_birth: member.date_of_birth,
            phone: member.phone,
            photo_url: member.photo_url,
            branch_name: member.branches?.name || null,
            birthday_date: format(birthdayThisYear, "yyyy-MM-dd"),
            is_past: true,
            day_born: member.day_born || null,
          });
        }
        // Check if birthday falls within today or next 7 days
        else if (birthdayStart >= today && birthdayStart <= weekAhead) {
          upcoming.push({
            id: member.id,
            full_name: member.full_name,
            date_of_birth: member.date_of_birth,
            phone: member.phone,
            photo_url: member.photo_url,
            branch_name: member.branches?.name || null,
            birthday_date: format(birthdayThisYear, "yyyy-MM-dd"),
            is_past: false,
            day_born: member.day_born || null,
          });
        }
      });

      // Sort by birthday date
      pastWeek.sort((a, b) => b.birthday_date.localeCompare(a.birthday_date)); // Most recent first
      upcoming.sort((a, b) => a.birthday_date.localeCompare(b.birthday_date)); // Soonest first

      return { pastWeek, upcoming };
    },
    enabled: !!profile?.church_id && !accessLoading,
  });
}
