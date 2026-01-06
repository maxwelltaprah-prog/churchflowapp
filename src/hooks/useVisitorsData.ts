import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess } from "./useBranchAccess";

export interface Visitor {
  id: string;
  church_id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  gender: "male" | "female" | "prefer_not_to_say" | null;
  date_of_birth: string | null;
  first_visit_date: string;
  how_heard: "friend_family" | "social_media" | "walk_in" | "outreach" | "other";
  status: "new" | "in_follow_up" | "converted";
  converted_member_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: { name: string };
}

export interface VisitorFollowup {
  id: string;
  visitor_id: string;
  church_id: string;
  followup_date: string;
  followup_type: "sms" | "phone_call" | "visit" | "other";
  notes: string | null;
  conducted_by: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

export function useVisitors(branchId?: string, statusFilter?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["visitors", profile?.church_id, branchId, statusFilter, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) throw new Error("No church ID");

      let query = supabase
        .from("visitors")
        .select(`
          *,
          branches:branch_id (name)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      } else if (accessibleBranchIds && accessibleBranchIds.length > 0) {
        query = query.in("branch_id", accessibleBranchIds);
      }

      if (statusFilter && statusFilter !== "all") {
        // Cast to the correct type for Supabase
        const status = statusFilter as "new" | "in_follow_up" | "converted";
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Visitor[];
    },
    enabled: !!profile?.church_id,
  });
}

export function useVisitor(visitorId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["visitor", visitorId],
    queryFn: async () => {
      if (!visitorId) throw new Error("No visitor ID");

      const { data, error } = await supabase
        .from("visitors")
        .select(`
          *,
          branches:branch_id (name)
        `)
        .eq("id", visitorId)
        .single();

      if (error) throw error;
      return data as Visitor;
    },
    enabled: !!visitorId && !!profile?.church_id,
  });
}

export function useVisitorFollowups(visitorId: string | undefined) {
  return useQuery({
    queryKey: ["visitor-followups", visitorId],
    queryFn: async () => {
      if (!visitorId) throw new Error("No visitor ID");

      const { data, error } = await supabase
        .from("visitor_followups")
        .select(`*`)
        .eq("visitor_id", visitorId)
        .order("followup_date", { ascending: false });

      if (error) throw error;

      // Fetch profile names separately
      const followupsWithProfiles = await Promise.all(
        data.map(async (followup) => {
          if (followup.conducted_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", followup.conducted_by)
              .single();
            return { ...followup, profiles: profile };
          }
          return { ...followup, profiles: null };
        })
      );

      return followupsWithProfiles as VisitorFollowup[];
    },
    enabled: !!visitorId,
  });
}

export function useVisitorStats() {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["visitor-stats", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) throw new Error("No church ID");

      let query = supabase
        .from("visitors")
        .select("status")
        .eq("church_id", profile.church_id);

      if (accessibleBranchIds && accessibleBranchIds.length > 0) {
        query = query.in("branch_id", accessibleBranchIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data.length,
        new: data.filter((v) => v.status === "new").length,
        inFollowUp: data.filter((v) => v.status === "in_follow_up").length,
        converted: data.filter((v) => v.status === "converted").length,
      };

      return stats;
    },
    enabled: !!profile?.church_id,
  });
}
