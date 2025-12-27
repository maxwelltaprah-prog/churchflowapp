import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Group {
  id: string;
  church_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  branches?: { name: string } | null;
  member_count?: number;
}

export interface MemberGroup {
  id: string;
  member_id: string;
  group_id: string;
  joined_at: string;
  groups?: Group;
}

// Fetch all groups for the church
export function useGroups(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["groups", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("groups")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Group[];
    },
    enabled: !!profile?.church_id,
  });
}

// Fetch active groups for a church (for member forms)
export function useActiveGroups(branchId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["active-groups", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("groups")
        .select("id, name, branch_id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

// Fetch groups for a specific member
export function useMemberGroups(memberId: string | null) {
  return useQuery({
    queryKey: ["member-groups", memberId],
    queryFn: async () => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("member_groups")
        .select("*, groups(id, name)")
        .eq("member_id", memberId);

      if (error) throw error;
      return data as MemberGroup[];
    },
    enabled: !!memberId,
  });
}

// Fetch group stats (member counts)
export function useGroupStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["group-stats", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return {};

      const { data, error } = await supabase
        .from("member_groups")
        .select("group_id, groups!inner(church_id)")
        .eq("groups.church_id", profile.church_id);

      if (error) throw error;

      // Count members per group
      const counts: Record<string, number> = {};
      data?.forEach((mg: { group_id: string }) => {
        counts[mg.group_id] = (counts[mg.group_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!profile?.church_id,
  });
}
