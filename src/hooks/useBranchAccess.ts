import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BranchAccess {
  isChurchAdmin: boolean;
  accessibleBranchIds: string[] | null; // null means all branches (church admin)
  canAccessBranch: (branchId: string) => boolean;
  isLoading: boolean;
}

/**
 * Hook to determine which branches the current user can access.
 * - Church Admins: null (meaning all branches)
 * - Branch Admins/Ushers: array of specific branch IDs
 */
export function useBranchAccess(): BranchAccess {
  const { profile, roles, isChurchAdmin: checkIsChurchAdmin, isLoading: authLoading } = useAuth();
  
  const isChurchAdmin = checkIsChurchAdmin();
  
  const { data: accessibleBranchIds, isLoading: queryLoading } = useQuery({
    queryKey: ["accessible-branches", profile?.church_id, roles],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      // Church admins can access all branches
      if (isChurchAdmin) return null;
      
      // Get branch IDs from user roles
      const branchIds = roles
        .filter(r => r.branch_id && r.church_id === profile.church_id)
        .map(r => r.branch_id as string);
      
      // Return unique branch IDs
      return [...new Set(branchIds)];
    },
    enabled: !!profile?.church_id && !authLoading,
  });

  const canAccessBranch = (branchId: string): boolean => {
    if (isChurchAdmin) return true;
    if (!accessibleBranchIds) return false;
    return accessibleBranchIds.includes(branchId);
  };

  return {
    isChurchAdmin,
    accessibleBranchIds: accessibleBranchIds ?? null,
    canAccessBranch,
    isLoading: authLoading || queryLoading,
  };
}

/**
 * Helper to build a Supabase query with branch filtering.
 * Returns the query with appropriate .in() or .eq() filter applied.
 */
export function applyBranchFilter<T extends { eq: (col: string, val: string) => T; in: (col: string, vals: string[]) => T }>(
  query: T,
  branchColumn: string,
  accessibleBranchIds: string[] | null
): T {
  // null means church admin - no filtering needed
  if (accessibleBranchIds === null) return query;
  
  // Empty array means no access
  if (accessibleBranchIds.length === 0) {
    // Return a query that will match nothing by filtering for impossible value
    return query.in(branchColumn, ["__no_access__"]);
  }
  
  // Filter by accessible branches
  if (accessibleBranchIds.length === 1) {
    return query.eq(branchColumn, accessibleBranchIds[0]);
  }
  
  return query.in(branchColumn, accessibleBranchIds);
}
