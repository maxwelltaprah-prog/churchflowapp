import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess } from "./useBranchAccess";

// Fetch church data
export function useChurch() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["church", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id
  });
}

// Fetch branches for the current church (filtered by access)
export function useBranches() {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["branches", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      let query = supabase
        .from("branches")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("is_main_branch", { ascending: false })
        .order("name");

      // Apply branch filter for non-church-admins
      if (accessibleBranchIds !== null && accessibleBranchIds.length > 0) {
        query = query.in("id", accessibleBranchIds);
      } else if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return []; // No access to any branches
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Fetch members for the current church (filtered by branch access)
export function useMembers(branchId?: string, approvalFilter?: "all" | "pending" | "approved" | "rejected") {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["members", profile?.church_id, branchId, approvalFilter, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      // No access to any branches
      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }
      
      let query = supabase
        .from("members")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("full_name");

      // Apply specific branch filter if provided
      if (branchId) {
        query = query.eq("branch_id", branchId);
      } else if (accessibleBranchIds !== null) {
        // Apply branch access filter
        query = query.in("branch_id", accessibleBranchIds);
      }

      if (approvalFilter && approvalFilter !== "all") {
        query = query.eq("approval_status", approvalFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Fetch pending members count (filtered by branch access)
export function usePendingMembersCount() {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["pending-members-count", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return 0;
      
      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return 0;
      }
      
      let query = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "pending");

      if (accessibleBranchIds !== null) {
        query = query.in("branch_id", accessibleBranchIds);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Fetch services for the current church (filtered by branch access) - future services only
export function useServices(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["services", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }
      
      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .gte("service_date", new Date().toISOString().split("T")[0])
        .order("service_date")
        .order("start_time");

      if (branchId) {
        query = query.eq("branch_id", branchId);
      } else if (accessibleBranchIds !== null) {
        query = query.in("branch_id", accessibleBranchIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Fetch ALL services for the current church (including past services) - for filtering purposes
export function useAllServices(branchId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["all-services", profile?.church_id, branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }
      
      let query = supabase
        .from("services")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("service_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      } else if (accessibleBranchIds !== null) {
        query = query.in("branch_id", accessibleBranchIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id && !accessLoading,
    // Refetch when services might change
    refetchOnWindowFocus: true,
  });
}

// Fetch attendance for a service
export function useAttendance(serviceId?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["attendance", serviceId],
    queryFn: async () => {
      if (!serviceId || !profile?.church_id) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*, members(full_name, member_code, photo_url)")
        .eq("service_id", serviceId)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!serviceId && !!profile?.church_id
  });
}

// Dashboard statistics (filtered by branch access)
export function useDashboardStats() {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["dashboard-stats", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return {
          memberCount: 0,
          branchCount: 0,
          serviceCount: 0,
          todayCheckins: 0
        };
      }

      // Get member count
      let memberQuery = supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      if (accessibleBranchIds !== null) {
        memberQuery = memberQuery.in("branch_id", accessibleBranchIds);
      }
      const { count: memberCount } = await memberQuery;

      // Get branch count
      let branchQuery = supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);
      
      if (accessibleBranchIds !== null) {
        branchQuery = branchQuery.in("id", accessibleBranchIds);
      }
      const { count: branchCount } = await branchQuery;

      // Get this week's services
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      let serviceQuery = supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("service_date", weekStart.toISOString().split("T")[0])
        .lte("service_date", weekEnd.toISOString().split("T")[0]);
      
      if (accessibleBranchIds !== null) {
        serviceQuery = serviceQuery.in("branch_id", accessibleBranchIds);
      }
      const { count: serviceCount } = await serviceQuery;

      // Get today's check-ins
      let checkinQuery = supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", new Date().toISOString().split("T")[0]);
      
      if (accessibleBranchIds !== null) {
        checkinQuery = checkinQuery.in("branch_id", accessibleBranchIds);
      }
      const { count: todayCheckins } = await checkinQuery;

      return {
        memberCount: memberCount || 0,
        branchCount: branchCount || 0,
        serviceCount: serviceCount || 0,
        todayCheckins: todayCheckins || 0
      };
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Branch statistics (filtered by branch access)
export function useBranchStats() {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["branch-stats", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      // Get branches with member counts
      let query = supabase
        .from("branches")
        .select("id, name, location, is_main_branch, join_code, is_active, overseer_name, overseer_phone, overseer_email")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (accessibleBranchIds !== null) {
        query = query.in("id", accessibleBranchIds);
      }

      const { data: branches } = await query;

      if (!branches) return [];

      // Get member counts per branch
      const branchStats = await Promise.all(
        branches.map(async (branch) => {
          const { count: memberCount } = await supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .eq("is_active", true);

          // Get today's attendance for this branch
          const { count: todayAttendance } = await supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .gte("checked_in_at", new Date().toISOString().split("T")[0]);

          return {
            ...branch,
            memberCount: memberCount || 0,
            todayAttendance: todayAttendance || 0
          };
        })
      );

      return branchStats;
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Recent activity (filtered by branch access)
export function useRecentActivity() {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["recent-activity", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      // Get recent check-ins
      let checkinQuery = supabase
        .from("attendance")
        .select("checked_in_at, branch_id, members(full_name), services(name, branches(name))")
        .eq("church_id", profile.church_id)
        .order("checked_in_at", { ascending: false })
        .limit(10);

      if (accessibleBranchIds !== null) {
        checkinQuery = checkinQuery.in("branch_id", accessibleBranchIds);
      }

      const { data: recentCheckins } = await checkinQuery;

      // Get recent members
      let memberQuery = supabase
        .from("members")
        .select("full_name, created_at, branch_id, branches(name)")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (accessibleBranchIds !== null) {
        memberQuery = memberQuery.in("branch_id", accessibleBranchIds);
      }

      const { data: recentMembers } = await memberQuery;

      const activities: Array<{
        type: "checkin" | "member" | "service";
        title: string;
        description: string;
        time: Date;
      }> = [];

      recentCheckins?.forEach((checkin: any) => {
        const member = checkin.members;
        const service = checkin.services;
        const branch = service?.branches;
        activities.push({
          type: "checkin",
          title: `${member?.full_name || "Unknown"} checked in`,
          description: `${service?.name || "Service"} - ${branch?.name || "Branch"}`,
          time: new Date(checkin.checked_in_at)
        });
      });

      recentMembers?.forEach((member) => {
        const branch = member.branches as { name: string } | null;
        activities.push({
          type: "member",
          title: "New member registered",
          description: `${member.full_name} - ${branch?.name || "Branch"}`,
          time: new Date(member.created_at)
        });
      });

      // Sort by time and return top 5
      return activities
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5);
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}

// Find member by QR token
export function useMemberByQRToken(qrToken: string | null) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["member-qr", qrToken],
    queryFn: async () => {
      if (!qrToken || !profile?.church_id) return null;
      
      const { data, error } = await supabase
        .from("members")
        .select("*, branches(name)")
        .eq("qr_code_token", qrToken)
        .eq("church_id", profile.church_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!qrToken && !!profile?.church_id
  });
}

// Fetch broadcasts (filtered by branch access)
export function useBroadcasts() {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  
  return useQuery({
    queryKey: ["broadcasts", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      // Church-wide broadcasts (branch_id is null) should be visible to all
      // Branch-specific broadcasts should be filtered
      let query = supabase
        .from("broadcasts")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .order("sent_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter broadcasts based on access
      if (accessibleBranchIds !== null) {
        return (data || []).filter(broadcast => 
          broadcast.branch_id === null || // Church-wide broadcasts
          accessibleBranchIds.includes(broadcast.branch_id) // Branch-specific broadcasts user can access
        );
      }

      return data;
    },
    enabled: !!profile?.church_id && !accessLoading
  });
}
