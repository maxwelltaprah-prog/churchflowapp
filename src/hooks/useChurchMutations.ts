import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Create a new member
export function useCreateMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      full_name: string;
      phone?: string;
      email?: string;
      gender?: "male" | "female";
      membership_status?: "member" | "visitor" | "new_convert";
      branch_id: string;
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Generate member code and QR token
      const { data: church } = await supabase
        .from("churches")
        .select("slug")
        .eq("id", profile.church_id)
        .single();

      const memberCode = `${church?.slug?.toUpperCase().substring(0, 3) || "CHU"}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
      const qrToken = crypto.randomUUID();

      const { data: member, error } = await supabase
        .from("members")
        .insert({
          church_id: profile.church_id,
          branch_id: data.branch_id,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
          gender: data.gender,
          membership_status: data.membership_status || "visitor",
          member_code: memberCode,
          qr_code_token: qrToken,
        })
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Member added successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Create a new branch
export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      location?: string;
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Get church slug for join code
      const { data: church } = await supabase
        .from("churches")
        .select("slug")
        .eq("id", profile.church_id)
        .single();

      const branchPrefix = data.name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const joinCode = `${church?.slug?.toUpperCase().substring(0, 3) || "CHU"}-${branchPrefix}-${randomNum}`;

      const { data: branch, error } = await supabase
        .from("branches")
        .insert({
          church_id: profile.church_id,
          name: data.name,
          location: data.location,
          join_code: joinCode,
        })
        .select()
        .single();

      if (error) throw error;
      return branch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Branch created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Create a new service
export function useCreateService() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      service_date: string;
      start_time?: string;
      end_time?: string;
      branch_id: string;
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      const { data: service, error } = await supabase
        .from("services")
        .insert({
          church_id: profile.church_id,
          branch_id: data.branch_id,
          name: data.name,
          description: data.description,
          service_date: data.service_date,
          start_time: data.start_time,
          end_time: data.end_time,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Service created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Record attendance
export function useRecordAttendance() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      service_id: string;
      member_id: string;
      branch_id: string;
      member_home_branch_id?: string;
      checkin_method?: "staff_scan" | "self_scan";
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      const isCrossBranch = data.member_home_branch_id && data.member_home_branch_id !== data.branch_id;

      const { data: attendance, error } = await supabase
        .from("attendance")
        .insert({
          church_id: profile.church_id,
          branch_id: data.branch_id,
          service_id: data.service_id,
          member_id: data.member_id,
          checked_in_by: user?.id,
          checkin_method: data.checkin_method || "staff_scan",
          is_cross_branch: isCrossBranch,
          member_home_branch_id: isCrossBranch ? data.member_home_branch_id : null,
        })
        .select("*, members(full_name)")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Member already checked in for this service");
        }
        throw error;
      }
      return attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Find member by code or QR token
export function useFindMember() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (codeOrToken: string) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Try finding by member_code first
      let { data: member } = await supabase
        .from("members")
        .select("*, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("member_code", codeOrToken.toUpperCase())
        .maybeSingle();

      // If not found, try by QR token
      if (!member) {
        const { data: memberByToken } = await supabase
          .from("members")
          .select("*, branches(name)")
          .eq("church_id", profile.church_id)
          .eq("qr_code_token", codeOrToken)
          .maybeSingle();
        member = memberByToken;
      }

      if (!member) {
        throw new Error("Member not found");
      }

      return member;
    },
  });
}

// Update a member
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      full_name?: string;
      phone?: string;
      email?: string;
      gender?: "male" | "female";
      membership_status?: "member" | "visitor" | "new_convert";
      branch_id?: string;
    }) => {
      const { id, ...updateData } = data;
      const { data: member, error } = await supabase
        .from("members")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Deactivate a member
export function useDeactivateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("members")
        .update({ is_active: false })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Member deactivated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Create a broadcast
export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      branch_id?: string;
      target_scope?: string;
    }) => {
      if (!profile?.church_id || !user?.id) throw new Error("No church context");

      const { data: broadcast, error } = await supabase
        .from("broadcasts")
        .insert({
          church_id: profile.church_id,
          sent_by: user.id,
          title: data.title,
          message: data.message,
          branch_id: data.branch_id,
          target_scope: data.target_scope || "all",
        })
        .select()
        .single();

      if (error) throw error;
      return broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Broadcast sent successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Update church settings
export function useUpdateChurchSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name?: string;
      settings?: {
        allow_self_registration?: boolean;
        require_approval?: boolean;
        allow_cross_branch_checkin?: boolean;
      };
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      const { data: church, error } = await supabase
        .from("churches")
        .update(data)
        .eq("id", profile.church_id)
        .select()
        .single();

      if (error) throw error;
      return church;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church"] });
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Update user profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { full_name?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: profileData, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.user.id)
        .select()
        .single();

      if (error) throw error;
      return profileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
