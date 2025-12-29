import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminUser {
  id: string;
  user_id: string;
  role: "church_admin" | "branch_admin" | "usher";
  church_id: string;
  branch_id: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  branch: {
    id: string;
    name: string;
  } | null;
}

export function useAdmins() {
  const { profile, isChurchAdmin } = useAuth();
  
  return useQuery({
    queryKey: ["admins", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      // First fetch user_roles with their branch info
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          church_id,
          branch_id,
          created_at,
          branches!left (
            id,
            name
          )
        `)
        .eq("church_id", profile.church_id)
        .in("role", ["church_admin", "branch_admin", "usher"])
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      
      // Get unique user IDs
      const userIds = [...new Set(roles?.map(r => r.user_id) || [])];
      
      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map for quick profile lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Combine the data
      const admins: AdminUser[] = (roles || []).map(role => ({
        id: role.id,
        user_id: role.user_id,
        role: role.role as "church_admin" | "branch_admin" | "usher",
        church_id: role.church_id,
        branch_id: role.branch_id,
        created_at: role.created_at,
        profile: profileMap.get(role.user_id) || null,
        branch: role.branches ? {
          id: role.branches.id,
          name: role.branches.name
        } : null
      }));

      return admins;
    },
    enabled: !!profile?.church_id && isChurchAdmin(),
  });
}

export function useAdminsByUser() {
  const { data: admins, ...rest } = useAdmins();
  
  // Group admins by user_id to consolidate multiple branch assignments
  const adminsByUser = admins?.reduce((acc, admin) => {
    const existing = acc.get(admin.user_id);
    if (existing) {
      // User already exists, add branch to their list
      if (admin.branch) {
        existing.branches.push(admin.branch);
      }
      // If this role is "higher" priority, update the main role
      const rolePriority = { church_admin: 3, branch_admin: 2, usher: 1 };
      if (rolePriority[admin.role] > rolePriority[existing.role]) {
        existing.role = admin.role;
      }
    } else {
      // New user entry
      acc.set(admin.user_id, {
        user_id: admin.user_id,
        profile: admin.profile,
        role: admin.role,
        church_id: admin.church_id,
        branches: admin.branch ? [admin.branch] : [],
        created_at: admin.created_at,
        roleIds: [admin.id]
      });
    }
    // Always track all role IDs for this user
    const entry = acc.get(admin.user_id)!;
    if (!entry.roleIds.includes(admin.id)) {
      entry.roleIds.push(admin.id);
    }
    return acc;
  }, new Map<string, {
    user_id: string;
    profile: AdminUser["profile"];
    role: AdminUser["role"];
    church_id: string;
    branches: { id: string; name: string }[];
    created_at: string;
    roleIds: string[];
  }>());
  
  return {
    ...rest,
    data: adminsByUser ? Array.from(adminsByUser.values()) : undefined
  };
}
