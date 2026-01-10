import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { useConsecutiveMissSignals } from "./useConsecutiveMissSignals";

export type FollowUpPersonType = "first_time_visitor" | "returning_visitor" | "returnee";

export interface FollowUpPerson {
  id: string;
  name: string;
  phone: string | null;
  type: FollowUpPersonType;
  branchName?: string;
  metadata?: {
    previousVisits?: number;
    missedCount?: number;
    firstVisitDate?: string;
  };
}

/**
 * Hook to fetch people who need pastoral follow-up:
 * 1. First-time visitors - Guests whose first check-in matches selected service(s)
 * 2. Returning visitors - Guests with prior check-ins who attended selected service(s)
 * 3. Member returnees - Members who missed 3+ services but returned
 */
export function useNewPeopleToFollowUp(
  serviceIds: string[],
  branchId?: string,
  referenceServiceId?: string
) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  // Reuse engagement signals for returnees
  const { data: engagementData, isLoading: engagementLoading } = useConsecutiveMissSignals(
    branchId,
    referenceServiceId
  );

  return useQuery({
    queryKey: ["new-people-followup", profile?.church_id, serviceIds, branchId, accessibleBranchIds],
    queryFn: async (): Promise<FollowUpPerson[]> => {
      if (!profile?.church_id || serviceIds.length === 0) {
        return [];
      }

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      const results: FollowUpPerson[] = [];

      // 1. Get the earliest service date from selected services (for determining "prior" visits)
      const { data: selectedServices } = await supabase
        .from("services")
        .select("id, service_date, branch_id")
        .in("id", serviceIds);

      if (!selectedServices || selectedServices.length === 0) {
        return [];
      }

      const earliestServiceDate = selectedServices
        .map(s => s.service_date)
        .sort()[0];

      // 2. Get visitor check-ins for the selected services
      const { data: visitorCheckins } = await supabase
        .from("visitor_checkins")
        .select(`
          id,
          visitor_id,
          service_id,
          checked_in_at,
          visitors!inner (
            id,
            first_name,
            last_name,
            phone,
            branch_id,
            first_visit_date,
            status,
            branches (name)
          )
        `)
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      if (visitorCheckins && visitorCheckins.length > 0) {
        // Get unique visitor IDs from these check-ins
        const visitorIds = [...new Set(visitorCheckins.map(vc => vc.visitor_id))];

        // Get ALL check-in history for these visitors to determine first-time vs returning
        const { data: allVisitorCheckins } = await supabase
          .from("visitor_checkins")
          .select("visitor_id, service_id, checked_in_at, services(service_date)")
          .eq("church_id", profile.church_id)
          .in("visitor_id", visitorIds);

        // Build map: visitor_id -> { hasCheckinBeforeEarliestSelected, totalCheckins }
        const visitorHistory = new Map<string, { hasCheckinBefore: boolean; totalCheckins: number }>();
        
        visitorIds.forEach(vid => {
          const visitorAllCheckins = (allVisitorCheckins || []).filter(vc => vc.visitor_id === vid);
          const hasCheckinBefore = visitorAllCheckins.some(vc => {
            const serviceDate = (vc.services as any)?.service_date;
            return serviceDate && serviceDate < earliestServiceDate;
          });
          visitorHistory.set(vid, {
            hasCheckinBefore,
            totalCheckins: visitorAllCheckins.length
          });
        });

        // Process each unique visitor
        const processedVisitorIds = new Set<string>();
        
        for (const vc of visitorCheckins) {
          const visitor = vc.visitors as any;
          if (!visitor || processedVisitorIds.has(visitor.id)) continue;
          processedVisitorIds.add(visitor.id);

          // Apply branch filter if specified
          if (branchId && visitor.branch_id !== branchId) continue;
          if (accessibleBranchIds !== null && !accessibleBranchIds.includes(visitor.branch_id)) continue;

          const history = visitorHistory.get(visitor.id);
          const isFirstTime = !history?.hasCheckinBefore;

          results.push({
            id: visitor.id,
            name: `${visitor.first_name} ${visitor.last_name}`.trim(),
            phone: visitor.phone,
            type: isFirstTime ? "first_time_visitor" : "returning_visitor",
            branchName: visitor.branches?.name,
            metadata: {
              previousVisits: isFirstTime ? 0 : (history?.totalCheckins || 1) - 1,
              firstVisitDate: visitor.first_visit_date
            }
          });
        }
      }

      // 3. Add member returnees from engagement signals (processed separately)
      // This will be merged in the component since it uses a separate hook

      // Sort: first-time visitors first, then returning visitors
      results.sort((a, b) => {
        const priority = { first_time_visitor: 1, returning_visitor: 2 };
        return (priority[a.type] || 3) - (priority[b.type] || 3);
      });

      return results;
    },
    enabled: !!profile?.church_id && serviceIds.length > 0 && !accessLoading
  });
}

/**
 * Combined hook that merges visitor data with member returnees
 */
export function useNewPeopleToFollowUpCombined(
  serviceIds: string[],
  branchId?: string,
  referenceServiceId?: string
) {
  const { data: visitors, isLoading: visitorsLoading } = useNewPeopleToFollowUp(
    serviceIds,
    branchId,
    referenceServiceId
  );
  
  const { data: engagementData, isLoading: engagementLoading } = useConsecutiveMissSignals(
    branchId,
    referenceServiceId
  );

  const isLoading = visitorsLoading || engagementLoading;

  // Combine visitors with member returnees
  const combinedData: FollowUpPerson[] = [];

  // Add visitors (first-time and returning)
  if (visitors) {
    combinedData.push(...visitors);
  }

  // Add member returnees
  if (engagementData?.returnees) {
    engagementData.returnees.forEach(returnee => {
      combinedData.push({
        id: returnee.id,
        name: returnee.full_name,
        phone: returnee.phone,
        type: "returnee",
        branchName: returnee.branch_name,
        metadata: {
          missedCount: returnee.previous_missed_count
        }
      });
    });
  }

  // Sort by priority: first_time_visitor > returning_visitor > returnee
  combinedData.sort((a, b) => {
    const priority: Record<FollowUpPersonType, number> = {
      first_time_visitor: 1,
      returning_visitor: 2,
      returnee: 3
    };
    return priority[a.type] - priority[b.type];
  });

  // Limit to 12 people for dashboard display
  return {
    data: combinedData.slice(0, 12),
    isLoading
  };
}
