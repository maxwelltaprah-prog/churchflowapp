import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Create a new spiritual journey option
export function useCreateSpiritualJourney() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Get the max sort_order
      const { data: existing } = await supabase
        .from("spiritual_journeys")
        .select("sort_order")
        .eq("church_id", profile.church_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const { data: journey, error } = await supabase
        .from("spiritual_journeys")
        .insert({
          church_id: profile.church_id,
          name: data.name,
          description: data.description || null,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return journey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spiritual-journeys"] });
      toast.success("Spiritual journey option added");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Update an existing spiritual journey option
export function useUpdateSpiritualJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...updateData } = data;
      const { data: journey, error } = await supabase
        .from("spiritual_journeys")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return journey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spiritual-journeys"] });
      toast.success("Spiritual journey option updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Delete a spiritual journey option
export function useDeleteSpiritualJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("spiritual_journeys")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spiritual-journeys"] });
      toast.success("Spiritual journey option deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Set member's spiritual journeys (replace all)
export function useSetMemberSpiritualJourneys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { memberId: string; journeyIds: string[] }) => {
      // Delete existing associations
      const { error: deleteError } = await supabase
        .from("member_spiritual_journeys")
        .delete()
        .eq("member_id", data.memberId);

      if (deleteError) throw deleteError;

      // Insert new associations
      if (data.journeyIds.length > 0) {
        const { error: insertError } = await supabase
          .from("member_spiritual_journeys")
          .insert(
            data.journeyIds.map((journeyId) => ({
              member_id: data.memberId,
              spiritual_journey_id: journeyId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member-spiritual-journeys", variables.memberId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
