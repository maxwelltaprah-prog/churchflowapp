import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Create a new group
export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      branch_id?: string | null;
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Get max sort_order
      const { data: maxOrderData } = await supabase
        .from("groups")
        .select("sort_order")
        .eq("church_id", profile.church_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sortOrder = (maxOrderData?.sort_order ?? -1) + 1;

      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          church_id: profile.church_id,
          name: data.name,
          description: data.description,
          branch_id: data.branch_id || null,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["active-groups"] });
      toast.success("Group created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Update a group
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      branch_id?: string | null;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { id, ...updateData } = data;
      const { data: group, error } = await supabase
        .from("groups")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["active-groups"] });
      toast.success("Group updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Toggle group active status
export function useToggleGroupActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("groups")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["active-groups"] });
      toast.success(is_active ? "Group enabled" : "Group disabled");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Delete a group
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["active-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-stats"] });
      toast.success("Group deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Update group sort orders (for reordering)
export function useReorderGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase.from("groups").update({ sort_order }).eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["active-groups"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Set member groups (replace all)
export function useSetMemberGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, groupIds }: { memberId: string; groupIds: string[] }) => {
      // Delete existing memberships
      const { error: deleteError } = await supabase
        .from("member_groups")
        .delete()
        .eq("member_id", memberId);

      if (deleteError) throw deleteError;

      // Insert new memberships
      if (groupIds.length > 0) {
        const { error: insertError } = await supabase
          .from("member_groups")
          .insert(
            groupIds.map((groupId) => ({
              member_id: memberId,
              group_id: groupId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-stats"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
