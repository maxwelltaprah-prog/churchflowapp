import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// All available menus in the system
export const ALL_MENUS = [
  { key: "dashboard", label: "Dashboard", description: "Main overview and stats" },
  { key: "members", label: "Members", description: "Manage church members" },
  { key: "visitors", label: "Visitors", description: "Track and follow up with visitors" },
  { key: "groups", label: "Groups", description: "Manage ministry groups" },
  { key: "branches", label: "Branches", description: "Manage church branches" },
  { key: "services", label: "Services", description: "Schedule and manage services" },
  { key: "checkin", label: "Check-in", description: "Service check-in operations" },
  { key: "analytics", label: "Analytics", description: "Reports and insights" },
  { key: "broadcasts", label: "Broadcasts", description: "Send announcements" },
  { key: "sms", label: "SMS", description: "SMS messaging campaigns" },
  { key: "spiritual-journey", label: "Spiritual Journey", description: "Track spiritual milestones" },
  { key: "admins", label: "Admins", description: "Manage administrators" },
  { key: "settings", label: "Settings", description: "Church settings" },
] as const;

export type MenuKey = typeof ALL_MENUS[number]["key"];

// Hook to fetch current user's menu permissions for active church
export function useMyMenuPermissions() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["my-menu-permissions", user?.id, profile?.church_id],
    queryFn: async () => {
      if (!user?.id || !profile?.church_id) return [];
      
      const { data, error } = await supabase
        .rpc("get_menu_permissions", {
          _user_id: user.id,
          _church_id: profile.church_id,
        });

      if (error) {
        console.error("Error fetching menu permissions:", error);
        return [];
      }

      return (data as string[]) || [];
    },
    enabled: !!user?.id && !!profile?.church_id,
  });
}

// Hook to fetch current user's accessible branches for active church
export function useMyBranchPermissions() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["my-branch-permissions", user?.id, profile?.church_id],
    queryFn: async () => {
      if (!user?.id || !profile?.church_id) return [];

      const { data, error } = await supabase
        .rpc("get_accessible_branches", {
          _user_id: user.id,
          _church_id: profile.church_id,
        });

      if (error) {
        console.error("Error fetching branch permissions:", error);
        return [];
      }

      return (data as string[]) || [];
    },
    enabled: !!user?.id && !!profile?.church_id,
  });
}

// Hook to fetch all churches the current user has access to
export function useMyChurchAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-church-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all active roles for the user
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("church_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // Get unique church IDs
      const churchIds = [...new Set(roles.map((r) => r.church_id))];

      // Fetch church details
      const { data: churches, error: churchesError } = await supabase
        .from("churches")
        .select("id, name, slug, logo_url")
        .in("id", churchIds);

      if (churchesError) throw churchesError;

      // Combine with role info
      return (churches || []).map((church) => ({
        ...church,
        roles: roles.filter((r) => r.church_id === church.id).map((r) => r.role),
      }));
    },
    enabled: !!user?.id,
  });
}

// Check if user has access to a specific menu
export function useHasMenuAccess(menuKey: string) {
  const { data: permissions, isLoading } = useMyMenuPermissions();
  const { isChurchAdmin } = useAuth();

  if (isLoading) return { hasAccess: false, isLoading: true };
  
  // Church admins always have access
  if (isChurchAdmin()) return { hasAccess: true, isLoading: false };

  const hasAccess = permissions?.includes(menuKey) || false;
  return { hasAccess, isLoading: false };
}
