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
 * Hook to compute members who missed the 3 most recently CREATED services
 * and members who returned after being in that category.
 * 
 * Key logic:
 * - Uses the 3 most recently CREATED services (ordered by created_at timestamp)
 * - A member is "missed 3+" if they have no check-in on any of those 3 services
 * - A "returnee" is someone who was in missed-3+ before but checked in on the most recent created service
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

      // 1. Get the 3 most recently CREATED services (ordered by created_at descending)
      const { data: last3Services } = await supabase
        .from("services")
        .select("id, service_date, branch_id, created_at")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      // Need at least 3 created services to evaluate
      if (!last3Services || last3Services.length < 3) {
        return { missedCount: 0, returneeCount: 0, missedMembers: [], returnees: [] };
      }

      const mostRecentService = last3Services[0];
      const last3ServiceIds = last3Services.map(s => s.id);
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

      // 3. Get attendance records for these members for the last 3 created services
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("member_id, service_id")
        .eq("church_id", profile.church_id)
        .in("member_id", memberIds)
        .in("service_id", last3ServiceIds);

      // Build map: member_id -> Set of service_ids attended (within last 3)
      const memberAttendedServices = new Map<string, Set<string>>();
      memberIds.forEach(id => memberAttendedServices.set(id, new Set()));

      (attendanceData || []).forEach(a => {
        if (memberAttendedServices.has(a.member_id)) {
          memberAttendedServices.get(a.member_id)!.add(a.service_id);
        }
      });

      // 4. Also get the 4th most recent service to check for returnees
      // (we need to know if they missed that one too before the most recent check-in)
      const { data: prev3Services } = await supabase
        .from("services")
        .select("id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(1, 3); // Skip the most recent, get positions 2-4 (indices 1,2,3)

      const prev3ServiceIds = (prev3Services || []).map(s => s.id);

      // Get attendance for previous 3 services (excluding most recent)
      let prevAttendanceData: { member_id: string; service_id: string }[] = [];
      if (prev3ServiceIds.length === 3) {
        const { data } = await supabase
          .from("attendance")
          .select("member_id, service_id")
          .eq("church_id", profile.church_id)
          .in("member_id", memberIds)
          .in("service_id", prev3ServiceIds);
        prevAttendanceData = data || [];
      }

      const memberPrevAttendance = new Map<string, Set<string>>();
      memberIds.forEach(id => memberPrevAttendance.set(id, new Set()));
      prevAttendanceData.forEach(a => {
        if (memberPrevAttendance.has(a.member_id)) {
          memberPrevAttendance.get(a.member_id)!.add(a.service_id);
        }
      });

      // 5. Classify members
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
        const prevAttended = memberPrevAttendance.get(member.id) || new Set();
        
        // Count how many of the last 3 services they missed
        const missedCount = last3ServiceIds.filter(id => !attendedServices.has(id)).length;
        
        // Check if they attended the most recent service
        const attendedMostRecent = attendedServices.has(mostRecentServiceId);

        // Get last checkin date for display
        const lastCheckinDate = memberLastCheckin.get(member.id) || null;

        if (missedCount === 3) {
          // Member missed ALL of the last 3 created services
          missedMembers.push({
            id: member.id,
            full_name: member.full_name,
            phone: member.phone,
            email: member.email,
            branch_id: member.branch_id,
            membership_status: member.membership_status,
            last_checkin_date: lastCheckinDate ? format(parseISO(lastCheckinDate), "yyyy-MM-dd") : null,
            consecutive_missed: missedCount,
          });
        } else if (attendedMostRecent && prev3ServiceIds.length === 3) {
          // Member attended the most recent service
          // Check if they missed all 3 previous services (services 2, 3, 4 by creation order)
          const prevMissedCount = prev3ServiceIds.filter(id => !prevAttended.has(id)).length;
          
          if (prevMissedCount === 3) {
            // This is a returnee - they missed services 2,3,4 but attended service 1
            returnees.push({
              id: member.id,
              full_name: member.full_name,
              phone: member.phone,
              email: member.email,
              branch_id: member.branch_id,
              membership_status: member.membership_status,
              return_date: mostRecentService.service_date,
              previous_missed_count: prevMissedCount,
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
