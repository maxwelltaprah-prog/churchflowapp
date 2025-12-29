import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateAdminParams {
  email: string;
  fullName: string;
  password: string;
  role: "church_admin" | "branch_admin" | "usher";
  branchIds: string[]; // Empty means all branches (church_admin)
}

interface UpdateAdminParams {
  userId: string;
  role: "church_admin" | "branch_admin" | "usher";
  branchIds: string[];
  currentRoleIds: string[];
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateAdminParams) => {
      if (!profile?.church_id) throw new Error("No church context");

      // 1. Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const userId = authData.user.id;

      // 2. Update the profile with church_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          church_id: profile.church_id,
          full_name: params.fullName,
        })
        .eq("id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // 3. Create role assignments
      if (params.role === "church_admin") {
        // Church admin gets one role without branch_id
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            church_id: profile.church_id,
            role: "church_admin",
            branch_id: null,
          });

        if (roleError) throw roleError;
      } else {
        // Branch admin/usher gets role for each selected branch
        const roleInserts = params.branchIds.map((branchId) => ({
          user_id: userId,
          church_id: profile.church_id,
          role: params.role,
          branch_id: branchId,
        }));

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert(roleInserts);

        if (roleError) throw roleError;
      }

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator created successfully");
    },
    onError: (error: Error) => {
      console.error("Create admin error:", error);
      toast.error(error.message || "Failed to create administrator");
    },
  });
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: UpdateAdminParams) => {
      if (!profile?.church_id) throw new Error("No church context");

      // 1. Delete existing roles for this user in this church
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", params.userId)
        .eq("church_id", profile.church_id);

      if (deleteError) throw deleteError;

      // 2. Create new role assignments
      if (params.role === "church_admin") {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({
            user_id: params.userId,
            church_id: profile.church_id,
            role: "church_admin",
            branch_id: null,
          });

        if (insertError) throw insertError;
      } else {
        const roleInserts = params.branchIds.map((branchId) => ({
          user_id: params.userId,
          church_id: profile.church_id,
          role: params.role,
          branch_id: branchId,
        }));

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(roleInserts);

        if (insertError) throw insertError;
      }

      return { userId: params.userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator updated successfully");
    },
    onError: (error: Error) => {
      console.error("Update admin error:", error);
      toast.error(error.message || "Failed to update administrator");
    },
  });
}

export function useRemoveAdmin() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!profile?.church_id) throw new Error("No church context");
      if (userId === user?.id) throw new Error("Cannot remove yourself");

      // Delete all roles for this user in this church
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("church_id", profile.church_id);

      if (error) throw error;

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator access removed");
    },
    onError: (error: Error) => {
      console.error("Remove admin error:", error);
      toast.error(error.message || "Failed to remove administrator");
    },
  });
}
