import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

// Fetch branches for the current church
export function useBranches() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["branches", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("is_main_branch", { ascending: false })
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id
  });
}

// Fetch members for the current church
export function useMembers(branchId?: string, approvalFilter?: "all" | "pending" | "approved" | "rejected") {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["members", profile?.church_id, branchId, approvalFilter],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      let query = supabase
        .from("members")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("full_name");

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      if (approvalFilter && approvalFilter !== "all") {
        query = query.eq("approval_status", approvalFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id
  });
}

// Fetch pending members count
export function usePendingMembersCount() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["pending-members-count", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return 0;
      
      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.church_id
  });
}

// Fetch services for the current church
export function useServices(branchId?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["services", profile?.church_id, branchId],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
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
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id
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

// Dashboard statistics
export function useDashboardStats() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["dashboard-stats", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      // Get member count
      const { count: memberCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      // Get branch count
      const { count: branchCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      // Get this week's services
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { count: serviceCount } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("service_date", weekStart.toISOString().split("T")[0])
        .lte("service_date", weekEnd.toISOString().split("T")[0]);

      // Get today's check-ins
      const { count: todayCheckins } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id)
        .gte("checked_in_at", new Date().toISOString().split("T")[0]);

      return {
        memberCount: memberCount || 0,
        branchCount: branchCount || 0,
        serviceCount: serviceCount || 0,
        todayCheckins: todayCheckins || 0
      };
    },
    enabled: !!profile?.church_id
  });
}

// Branch statistics
export function useBranchStats() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["branch-stats", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get branches with member counts
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, location, is_main_branch, join_code, is_active")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

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
    enabled: !!profile?.church_id
  });
}

// Recent activity
export function useRecentActivity() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["recent-activity", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Get recent check-ins
      const { data: recentCheckins } = await supabase
        .from("attendance")
        .select("checked_in_at, members(full_name), services(name, branches(name))")
        .eq("church_id", profile.church_id)
        .order("checked_in_at", { ascending: false })
        .limit(10);

      // Get recent members
      const { data: recentMembers } = await supabase
        .from("members")
        .select("full_name, created_at, branches(name)")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false })
        .limit(5);

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
    enabled: !!profile?.church_id
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

// Fetch broadcasts
export function useBroadcasts() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["broadcasts", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id
  });
}
