import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateAdminFromMemberParams {
  memberId: string;
  email: string;
  password: string;
  role: "church_admin" | "branch_admin" | "usher";
  menuPermissions: string[];
  branchIds: string[];
}

interface UpdateAdminPermissionsParams {
  userRoleId: string;
  role: "church_admin" | "branch_admin" | "usher";
  menuPermissions: string[];
  branchIds: string[];
}

// Create admin from existing member
export function useCreateAdminFromMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateAdminFromMemberParams) => {
      if (!profile?.church_id) throw new Error("No church context");

      // 1. Check if member already has a user account
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, email, user_id")
        .eq("id", params.memberId)
        .single();

      if (memberError) throw memberError;
      if (!member) throw new Error("Member not found");

      let userId = member.user_id;

      // 2. If member doesn't have a user account, create one
      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: member.full_name,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user account");

        userId = authData.user.id;

        // Update profile with church_id
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            church_id: profile.church_id,
            full_name: member.full_name,
          })
          .eq("id", userId);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        // Link member to user
        const { error: linkError } = await supabase
          .from("members")
          .update({ user_id: userId, email: params.email })
          .eq("id", params.memberId);

        if (linkError) {
          console.error("Member link error:", linkError);
        }
      }

      // 3. Create user_role entry
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          church_id: profile.church_id,
          role: params.role,
          member_id: params.memberId,
          is_active: true,
          branch_id: null, // We'll use the new permission tables instead
        })
        .select()
        .single();

      if (roleError) throw roleError;

      const userRoleId = roleData.id;

      // 4. Create menu permissions (only for non-church_admin roles)
      if (params.role !== "church_admin" && params.menuPermissions.length > 0) {
        const menuInserts = params.menuPermissions.map((menuKey) => ({
          user_role_id: userRoleId,
          menu_key: menuKey,
        }));

        const { error: menuError } = await supabase
          .from("admin_menu_permissions")
          .insert(menuInserts);

        if (menuError) {
          console.error("Menu permissions error:", menuError);
        }
      }

      // 5. Create branch permissions (only for non-church_admin roles)
      if (params.role !== "church_admin" && params.branchIds.length > 0) {
        const branchInserts = params.branchIds.map((branchId) => ({
          user_role_id: userRoleId,
          branch_id: branchId,
        }));

        const { error: branchError } = await supabase
          .from("admin_branch_permissions")
          .insert(branchInserts);

        if (branchError) {
          console.error("Branch permissions error:", branchError);
        }
      }

      return { userId, userRoleId };
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

// Update admin permissions
export function useUpdateAdminPermissions() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: UpdateAdminPermissionsParams) => {
      if (!profile?.church_id) throw new Error("No church context");

      // 1. Update the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: params.role })
        .eq("id", params.userRoleId);

      if (roleError) throw roleError;

      // 2. Delete existing menu permissions
      const { error: deleteMenuError } = await supabase
        .from("admin_menu_permissions")
        .delete()
        .eq("user_role_id", params.userRoleId);

      if (deleteMenuError) {
        console.error("Delete menu permissions error:", deleteMenuError);
      }

      // 3. Delete existing branch permissions
      const { error: deleteBranchError } = await supabase
        .from("admin_branch_permissions")
        .delete()
        .eq("user_role_id", params.userRoleId);

      if (deleteBranchError) {
        console.error("Delete branch permissions error:", deleteBranchError);
      }

      // 4. Create new menu permissions (only for non-church_admin roles)
      if (params.role !== "church_admin" && params.menuPermissions.length > 0) {
        const menuInserts = params.menuPermissions.map((menuKey) => ({
          user_role_id: params.userRoleId,
          menu_key: menuKey,
        }));

        const { error: menuError } = await supabase
          .from("admin_menu_permissions")
          .insert(menuInserts);

        if (menuError) {
          console.error("Menu permissions error:", menuError);
        }
      }

      // 5. Create new branch permissions (only for non-church_admin roles)
      if (params.role !== "church_admin" && params.branchIds.length > 0) {
        const branchInserts = params.branchIds.map((branchId) => ({
          user_role_id: params.userRoleId,
          branch_id: branchId,
        }));

        const { error: branchError } = await supabase
          .from("admin_branch_permissions")
          .insert(branchInserts);

        if (branchError) {
          console.error("Branch permissions error:", branchError);
        }
      }

      return { userRoleId: params.userRoleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator permissions updated");
    },
    onError: (error: Error) => {
      console.error("Update admin error:", error);
      toast.error(error.message || "Failed to update administrator");
    },
  });
}

// Revoke admin access (soft delete - sets is_active to false)
export function useRevokeAdminAccess() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (userRoleId: string) => {
      if (!profile?.church_id) throw new Error("No church context");

      const { data, error } = await supabase.functions.invoke("manage-admin-access", {
        body: { action: "revoke", userRoleId },
      });

      if (error) throw error;
      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || "Failed to revoke access");
      }

      return { userRoleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator access revoked");
    },
    onError: (error: Error) => {
      console.error("Revoke admin error:", error);
      toast.error(error.message || "Failed to revoke access");
    },
  });
}

// Restore admin access
export function useRestoreAdminAccess() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (userRoleId: string) => {
      if (!profile?.church_id) throw new Error("No church context");

      const { data, error } = await supabase.functions.invoke("manage-admin-access", {
        body: { action: "restore", userRoleId },
      });

      if (error) throw error;
      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || "Failed to restore access");
      }

      return { userRoleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator access restored");
    },
    onError: (error: Error) => {
      console.error("Restore admin error:", error);
      toast.error(error.message || "Failed to restore access");
    },
  });
}

// Permanently remove admin (hard delete)
export function useRemoveAdmin() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (userRoleId: string) => {
      if (!profile?.church_id) throw new Error("No church context");

      const { data, error } = await supabase.functions.invoke("manage-admin-access", {
        body: { action: "remove", userRoleId },
      });

      if (error) throw error;
      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || "Failed to remove administrator");
      }

      return { userRoleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Administrator removed permanently");
    },
    onError: (error: Error) => {
      console.error("Remove admin error:", error);
      toast.error(error.message || "Failed to remove administrator");
    },
  });
}
