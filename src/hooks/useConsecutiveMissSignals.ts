import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { format, parseISO } from "date-fns";

export interface MissedMember {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  branch_id: string;
  branch_name?: string;
  last_checkin_date: string | null;
  consecutive_missed: number;
}

export interface ReturneeMember {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  branch_id: string;
  branch_name?: string;
  return_date: string;
  previous_missed_count: number;
}

export interface ConsecutiveMissSignals {
  missedCount: number;
  returneeCount: number;
  missedMembers: MissedMember[];
  returnees: ReturneeMember[];
}

/**
 * Hook to compute members who missed 3+ consecutive service occurrences
 * and members who returned after being in that category.
 * 
 * Key logic:
 * - "Service occurrence" = unique calendar date with at least one service
 * - Multiple services on the same day count as ONE occurrence
 * - A member is "missed 3+" if they have no check-in on the last 3+ service days
 * - A "returnee" is someone who was in missed-3+ category but checked in on the most recent service day
 */
export function useConsecutiveMissSignals(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["consecutive-miss-signals", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async (): Promise<ConsecutiveMissSignals> => {
      if (!profile?.church_id) {
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      // 1. Get all service dates (unique calendar dates) ordered descending
      let servicesQuery = supabase
        .from("services")
        .select("id, service_date, branch_id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("service_date", { ascending: false });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: servicesData } = await servicesQuery;

      // Group services by date - each unique date is ONE service occurrence
      const servicesByDate = new Map<string, string[]>();
      (servicesData || []).forEach(s => {
        if (!servicesByDate.has(s.service_date)) {
          servicesByDate.set(s.service_date, []);
        }
        servicesByDate.get(s.service_date)!.push(s.id);
      });

      // Get unique service dates in descending order
      const uniqueServiceDates = Array.from(servicesByDate.keys()).sort((a, b) => b.localeCompare(a));

      if (uniqueServiceDates.length < 3) {
        // Not enough service days to determine 3+ missed
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      // 2. Get all active approved members (only members, not visitors/first-timers)
      let membersQuery = supabase
        .from("members")
        .select("id, full_name, phone, email, branch_id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .eq("membership_status", "member");

      membersQuery = applyBranchFilter(membersQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: allMembers } = await membersQuery;
      const memberIds = (allMembers || []).map(m => m.id);

      if (memberIds.length === 0) {
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      // 3. Get all attendance records for these members with service dates
      // We need to map attendance to service dates (not just checked_in_at)
      const allServiceIds = Array.from(servicesByDate.values()).flat();
      
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("member_id, service_id")
        .eq("church_id", profile.church_id)
        .in("member_id", memberIds)
        .in("service_id", allServiceIds);

      // Create a map: service_id -> service_date
      const serviceIdToDate = new Map<string, string>();
      (servicesData || []).forEach(s => {
        serviceIdToDate.set(s.id, s.service_date);
      });

      // Build map: member_id -> Set of service dates attended
      const memberAttendedDates = new Map<string, Set<string>>();
      memberIds.forEach(id => memberAttendedDates.set(id, new Set()));

      (attendanceData || []).forEach(a => {
        const serviceDate = serviceIdToDate.get(a.service_id);
        if (serviceDate && memberAttendedDates.has(a.member_id)) {
          memberAttendedDates.get(a.member_id)!.add(serviceDate);
        }
      });

      // 4. For each member, find consecutive missed service days from most recent
      const missedMembers: MissedMember[] = [];
      const returnees: ReturneeMember[] = [];

      const mostRecentServiceDate = uniqueServiceDates[0];

      (allMembers || []).forEach(member => {
        const attendedDates = memberAttendedDates.get(member.id) || new Set();
        
        // Count consecutive missed from the most recent service day
        let consecutiveMissed = 0;
        let lastAttendedIndex = -1;
        
        for (let i = 0; i < uniqueServiceDates.length; i++) {
          const serviceDate = uniqueServiceDates[i];
          if (attendedDates.has(serviceDate)) {
            lastAttendedIndex = i;
            break;
          }
          consecutiveMissed++;
        }

        // Get last attended date
        const lastCheckinDate = lastAttendedIndex >= 0 ? uniqueServiceDates[lastAttendedIndex] : null;

        if (consecutiveMissed >= 3) {
          // Member is in the missed 3+ category
          missedMembers.push({
            id: member.id,
            full_name: member.full_name,
            phone: member.phone,
            email: member.email,
            branch_id: member.branch_id,
            last_checkin_date: lastCheckinDate,
            consecutive_missed: consecutiveMissed,
          });
        } else if (consecutiveMissed === 0 && lastAttendedIndex === 0) {
          // Member attended on the most recent service day
          // Check if they WERE in missed 3+ before this attendance
          // by looking at their streak before the most recent day
          
          // Count consecutive missed starting from the 2nd most recent service day
          let previousMissed = 0;
          for (let i = 1; i < uniqueServiceDates.length; i++) {
            const serviceDate = uniqueServiceDates[i];
            if (attendedDates.has(serviceDate)) {
              break;
            }
            previousMissed++;
          }

          if (previousMissed >= 3) {
            // This is a returnee!
            returnees.push({
              id: member.id,
              full_name: member.full_name,
              phone: member.phone,
              email: member.email,
              branch_id: member.branch_id,
              return_date: mostRecentServiceDate,
              previous_missed_count: previousMissed,
            });
          }
        }
      });

      // 5. Fetch branch names for display
      let branchQuery = supabase
        .from("branches")
        .select("id, name")
        .eq("church_id", profile.church_id);

      const { data: branches } = await branchQuery;
      const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

      // Add branch names
      missedMembers.forEach(m => {
        m.branch_name = branchMap.get(m.branch_id) || "Unknown";
      });
      returnees.forEach(r => {
        r.branch_name = branchMap.get(r.branch_id) || "Unknown";
      });

      // Sort by consecutive missed (descending)
      missedMembers.sort((a, b) => b.consecutive_missed - a.consecutive_missed);

      return {
        missedCount: missedMembers.length,
        returneeCount: returnees.length,
        missedMembers,
        returnees,
      };
    },
    enabled: !!profile?.church_id && !accessLoading,
    refetchInterval: 60000, // Refresh every minute
  });
}
