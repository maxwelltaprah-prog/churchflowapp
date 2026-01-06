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

export function useVisitorStats(serviceIds: string[] = [], branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["visitor-stats", profile?.church_id, serviceIds, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) throw new Error("No church ID");

      // If service filter is applied, get stats based on visitor check-ins for those services
      if (serviceIds.length > 0) {
        // Get check-ins for the selected services
        let checkinsQuery = supabase
          .from("visitor_checkins")
          .select("visitor_id, checked_in_at")
          .eq("church_id", profile.church_id)
          .in("service_id", serviceIds);

        const { data: checkins, error: checkinsError } = await checkinsQuery;
        if (checkinsError) throw checkinsError;

        // Get unique visitor IDs from check-ins
        const visitorIds = [...new Set(checkins?.map(c => c.visitor_id) || [])];
        
        if (visitorIds.length === 0) {
          return { total: 0, new: 0, inFollowUp: 0, converted: 0, returning: 0 };
        }

        // Get visitor details for these IDs
        let visitorsQuery = supabase
          .from("visitors")
          .select("id, status")
          .eq("church_id", profile.church_id)
          .in("id", visitorIds);

        if (branchId) {
          visitorsQuery = visitorsQuery.eq("branch_id", branchId);
        } else if (accessibleBranchIds && accessibleBranchIds.length > 0) {
          visitorsQuery = visitorsQuery.in("branch_id", accessibleBranchIds);
        }

        const { data: visitors, error: visitorsError } = await visitorsQuery;
        if (visitorsError) throw visitorsError;

        // Count returning visitors (those who had check-ins BEFORE the selected services)
        let returningCount = 0;
        for (const visitorId of visitorIds) {
          const visitorCheckinsInSelection = checkins?.filter(c => c.visitor_id === visitorId) || [];
          const earliestInSelection = visitorCheckinsInSelection.reduce((min, c) => 
            c.checked_in_at < min ? c.checked_in_at : min, visitorCheckinsInSelection[0]?.checked_in_at
          );

          const { count } = await supabase
            .from("visitor_checkins")
            .select("id", { count: "exact", head: true })
            .eq("visitor_id", visitorId)
            .lt("checked_in_at", earliestInSelection);

          if ((count || 0) > 0) {
            returningCount++;
          }
        }

        const filteredVisitors = visitors || [];
        return {
          total: filteredVisitors.length,
          new: filteredVisitors.filter((v) => v.status === "new").length,
          inFollowUp: filteredVisitors.filter((v) => v.status === "in_follow_up").length,
          converted: filteredVisitors.filter((v) => v.status === "converted").length,
          returning: returningCount,
        };
      }

      // No service filter - get all visitors (original logic)
      let visitorsQuery = supabase
        .from("visitors")
        .select("id, status")
        .eq("church_id", profile.church_id);

      if (branchId) {
        visitorsQuery = visitorsQuery.eq("branch_id", branchId);
      } else if (accessibleBranchIds && accessibleBranchIds.length > 0) {
        visitorsQuery = visitorsQuery.in("branch_id", accessibleBranchIds);
      }

      const { data: visitors, error: visitorsError } = await visitorsQuery;
      if (visitorsError) throw visitorsError;

      // Get all visitor check-ins to count returning visitors
      const { data: checkins, error: checkinsError } = await supabase
        .from("visitor_checkins")
        .select("visitor_id")
        .eq("church_id", profile.church_id);

      if (checkinsError) throw checkinsError;

      // Count check-ins per visitor
      const checkinCounts = new Map<string, number>();
      checkins?.forEach((c) => {
        checkinCounts.set(c.visitor_id, (checkinCounts.get(c.visitor_id) || 0) + 1);
      });

      // Returning visitors = visitors with 2+ check-ins
      const returningVisitorIds = new Set(
        Array.from(checkinCounts.entries())
          .filter(([_, count]) => count >= 2)
          .map(([id]) => id)
      );

      return {
        total: visitors?.length || 0,
        new: visitors?.filter((v) => v.status === "new").length || 0,
        inFollowUp: visitors?.filter((v) => v.status === "in_follow_up").length || 0,
        converted: visitors?.filter((v) => v.status === "converted").length || 0,
        returning: returningVisitorIds.size,
      };
    },
    enabled: !!profile?.church_id,
  });
}

export function useVisitorCheckins(serviceId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["visitor-checkins", serviceId, profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) throw new Error("No church ID");

      let query = supabase
        .from("visitor_checkins")
        .select(`
          *,
          visitors:visitor_id (id, first_name, last_name, phone)
        `)
        .eq("church_id", profile.church_id)
        .order("checked_in_at", { ascending: false });

      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export interface VisitorCheckinHistory {
  id: string;
  visitor_id: string;
  service_id: string;
  checked_in_at: string;
  checkin_method: string;
  services?: {
    id: string;
    name: string;
    service_date: string;
  } | null;
}

export function useVisitorCheckinHistory(visitorId: string | undefined) {
  return useQuery({
    queryKey: ["visitor-checkin-history", visitorId],
    queryFn: async () => {
      if (!visitorId) throw new Error("No visitor ID");

      const { data, error } = await supabase
        .from("visitor_checkins")
        .select(`
          id,
          visitor_id,
          service_id,
          checked_in_at,
          checkin_method,
          services:service_id (id, name, service_date)
        `)
        .eq("visitor_id", visitorId)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;
      return data as VisitorCheckinHistory[];
    },
    enabled: !!visitorId,
  });
}
