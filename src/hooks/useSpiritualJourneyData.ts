import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SpiritualJourney {
  id: string;
  church_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all spiritual journeys for the church
export function useSpiritualJourneys() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["spiritual-journeys", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("spiritual_journeys")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as SpiritualJourney[];
    },
    enabled: !!profile?.church_id,
  });
}

// Fetch only active spiritual journeys (for member forms)
export function useActiveSpiritualJourneys() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["spiritual-journeys", profile?.church_id, "active"],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("spiritual_journeys")
        .select("*")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as SpiritualJourney[];
    },
    enabled: !!profile?.church_id,
  });
}

// Fetch spiritual journey IDs for a specific member
export function useMemberSpiritualJourneys(memberId: string | null) {
  return useQuery({
    queryKey: ["member-spiritual-journeys", memberId],
    queryFn: async () => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("member_spiritual_journeys")
        .select("spiritual_journey_id")
        .eq("member_id", memberId);

      if (error) throw error;
      return data.map((d) => d.spiritual_journey_id);
    },
    enabled: !!memberId,
  });
}
