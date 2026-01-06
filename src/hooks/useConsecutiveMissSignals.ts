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
  membership_status: string | null;
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
  membership_status: string | null;
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
 * Hook to compute members who missed services 2, 3, 4 (by creation order)
 * and members who returned after being in that category.
 * 
 * Key logic:
 * - Service 1 = most recently created service (reference only)
 * - Services 2, 3, 4 = the 3 services created before service 1
 * - "Missed 3+" = members who missed services 2, 3, 4 (regardless of service 1 attendance)
 * - "Returnee" = members who missed services 2, 3, 4 BUT attended service 1
 * 
 * @param branchId - Optional branch filter for members (not services)
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

      // 1. Get the 4 most recently CREATED services (ordered by created_at descending)
      // Service 1 (index 0) = most recent (reference), Services 2,3,4 (indices 1,2,3) = the ones we check for misses
      const { data: last4Services } = await supabase
        .from("services")
        .select("id, service_date, branch_id, created_at")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);

      // Need at least 4 created services to evaluate (1 reference + 3 to check)
      if (!last4Services || last4Services.length < 4) {
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      const mostRecentService = last4Services[0]; // Service 1 (reference)
      const services234 = last4Services.slice(1, 4); // Services 2, 3, 4
      const services234Ids = services234.map(s => s.id);
      const mostRecentServiceId = mostRecentService.id;

      // 2. Get ALL active approved members in the tenant
      let membersQuery = supabase
        .from("members")
        .select("id, full_name, phone, email, branch_id, membership_status")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved");

      membersQuery = applyBranchFilter(membersQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: allMembers } = await membersQuery;

      if (!allMembers || allMembers.length === 0) {
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      const memberIds = allMembers.map(m => m.id);

      // 3. Get attendance records for services 2, 3, 4 and service 1
      const allServiceIds = [mostRecentServiceId, ...services234Ids];
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("member_id, service_id")
        .eq("church_id", profile.church_id)
        .in("member_id", memberIds)
        .in("service_id", allServiceIds);

      // Build map: member_id -> Set of service_ids attended
      const memberAttendedServices = new Map<string, Set<string>>();
      memberIds.forEach(id => memberAttendedServices.set(id, new Set()));

      (attendanceData || []).forEach(a => {
        if (memberAttendedServices.has(a.member_id)) {
          memberAttendedServices.get(a.member_id)!.add(a.service_id);
        }
      });

      // 4. Classify members
      const missedMembers: MissedMember[] = [];
      const returnees: ReturneeMember[] = [];

      // Get last attendance date for missed members display
      const { data: allAttendance } = await supabase
        .from("attendance")
        .select("member_id, checked_in_at")
        .eq("church_id", profile.church_id)
        .in("member_id", memberIds)
        .order("checked_in_at", { ascending: false });

      const memberLastCheckin = new Map<string, string>();
      (allAttendance || []).forEach(a => {
        if (!memberLastCheckin.has(a.member_id)) {
          memberLastCheckin.set(a.member_id, a.checked_in_at);
        }
      });

      (allMembers || []).forEach(member => {
        const attendedServices = memberAttendedServices.get(member.id) || new Set();
        
        // Check how many of services 2, 3, 4 they missed
        const missed234Count = services234Ids.filter(id => !attendedServices.has(id)).length;
        
        // Check if they attended the most recent service (service 1)
        const attendedService1 = attendedServices.has(mostRecentServiceId);

        // Get last checkin date for display
        const lastCheckinDate = memberLastCheckin.get(member.id) || null;

        // Missed 3+: Members who missed services 2, 3, 4 (regardless of service 1 attendance)
        if (missed234Count === 3) {
          missedMembers.push({
            id: member.id,
            full_name: member.full_name,
            phone: member.phone,
            email: member.email,
            branch_id: member.branch_id,
            membership_status: member.membership_status,
            last_checkin_date: lastCheckinDate ? format(parseISO(lastCheckinDate), "yyyy-MM-dd") : null,
            consecutive_missed: missed234Count,
          });

          // Returnee: Members who missed services 2, 3, 4 BUT attended service 1
          if (attendedService1) {
            returnees.push({
              id: member.id,
              full_name: member.full_name,
              phone: member.phone,
              email: member.email,
              branch_id: member.branch_id,
              membership_status: member.membership_status,
              return_date: mostRecentService.service_date,
              previous_missed_count: missed234Count,
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
