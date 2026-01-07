import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminUser {
  id: string; // user_roles.id
  user_id: string;
  member_id: string | null;
  role: "church_admin" | "branch_admin" | "usher";
  church_id: string;
  is_active: boolean;
  created_at: string;
  member: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
  } | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  menuPermissions: string[];
  branchPermissions: {
    id: string;
    name: string;
  }[];
}

export function useAdmins(includeInactive = false) {
  const { profile, isChurchAdmin, user } = useAuth();

  return useQuery({
    queryKey: ["admins", profile?.church_id, includeInactive],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // 1. Fetch user_roles with member info
      let query = supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          member_id,
          role,
          church_id,
          is_active,
          created_at,
          members (
            id,
            full_name,
            email,
            phone,
            photo_url
          )
        `)
        .eq("church_id", profile.church_id)
        .in("role", ["church_admin", "branch_admin", "usher"])
        .order("created_at", { ascending: false });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data: roles, error: rolesError } = await query;

      if (rolesError) throw rolesError;
      
      // Build list with current user's role always included if they are an admin
      let rolesList = roles || [];
      if (rolesList.length === 0) return [];

      // 2. Fetch profiles for all user_ids
      const userIds = rolesList.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Profiles fetch error:", profilesError);
      }

      // Create a map of profiles by user_id
      const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));

      // 2. Get all role IDs
      const roleIds = rolesList.map((r) => r.id);

      // 3. Fetch menu permissions for these roles
      const { data: menuPerms, error: menuError } = await supabase
        .from("admin_menu_permissions")
        .select("user_role_id, menu_key")
        .in("user_role_id", roleIds);

      if (menuError) {
        console.error("Menu permissions error:", menuError);
      }

      // 4. Fetch branch permissions with branch names
      const { data: branchPerms, error: branchError } = await supabase
        .from("admin_branch_permissions")
        .select(`
          user_role_id,
          branch_id,
          branches!inner (
            id,
            name
          )
        `)
        .in("user_role_id", roleIds);

      if (branchError) {
        console.error("Branch permissions error:", branchError);
      }
      // 6. Build the result
      const admins: AdminUser[] = rolesList.map((role) => {
        // Handle the nested data properly - Supabase returns single objects for one-to-one joins
        const memberData = role.members as {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          photo_url: string | null;
        } | null;
        
        // Get profile from our map
        const profileData = profilesMap.get(role.user_id) || null;

        const roleMenuPerms = (menuPerms || [])
          .filter((p) => p.user_role_id === role.id)
          .map((p) => p.menu_key);

        const roleBranchPerms = (branchPerms || [])
          .filter((p) => p.user_role_id === role.id)
          .map((p) => ({
            id: (p.branches as any).id,
            name: (p.branches as any).name,
          }));

        return {
          id: role.id,
          user_id: role.user_id,
          member_id: role.member_id,
          role: role.role as "church_admin" | "branch_admin" | "usher",
          church_id: role.church_id,
          is_active: role.is_active,
          created_at: role.created_at,
          member: memberData ? {
            id: memberData.id,
            full_name: memberData.full_name,
            email: memberData.email,
            phone: memberData.phone,
            photo_url: memberData.photo_url,
          } : null,
          profile: profileData ? {
            id: profileData.id,
            full_name: profileData.full_name,
            email: profileData.email,
          } : null,
          menuPermissions: roleMenuPerms,
          branchPermissions: roleBranchPerms,
        };
      });

      return admins;
    },
    enabled: !!profile?.church_id && isChurchAdmin(),
  });
}

// Search members for admin selection
export function useSearchMembersForAdmin(searchQuery: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["members-admin-search", profile?.church_id, searchQuery],
    queryFn: async () => {
      if (!profile?.church_id || searchQuery.length < 2) return [];

      const search = `%${searchQuery}%`;

      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, email, phone, photo_url, branch_id, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .or(`full_name.ilike.${search},email.ilike.${search},phone.ilike.${search}`)
        .order("full_name")
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id && searchQuery.length >= 2,
  });
}

// Check if member is already an admin
export function useMemberAdminStatus(memberId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["member-admin-status", profile?.church_id, memberId],
    queryFn: async () => {
      if (!profile?.church_id || !memberId) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("id, role, is_active")
        .eq("church_id", profile.church_id)
        .eq("member_id", memberId)
        .in("role", ["church_admin", "branch_admin", "usher"]);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!profile?.church_id && !!memberId,
  });
}
