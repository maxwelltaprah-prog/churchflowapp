import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Feature toggle keys for engagement features
export interface EngagementSettings {
  enableTodayAtChurch: boolean;
  enablePrayerWall: boolean;
  enablePersonalizedFeed: boolean;
  enableSermonFollowups: boolean;
}

// Default settings - features enabled by default for a good out-of-box experience
const DEFAULT_SETTINGS: EngagementSettings = {
  enableTodayAtChurch: true,
  enablePrayerWall: true,
  enablePersonalizedFeed: true,
  enableSermonFollowups: true,
};

// Hook to fetch engagement settings from church settings JSON
export function useEngagementSettings(churchId: string | undefined) {
  return useQuery({
    queryKey: ["engagement-settings", churchId],
    queryFn: async () => {
      if (!churchId) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from("churches")
        .select("settings")
        .eq("id", churchId)
        .single();

      if (error) throw error;

      const settings = data?.settings as Record<string, any> | null;
      
      return {
        enableTodayAtChurch: settings?.enableTodayAtChurch ?? DEFAULT_SETTINGS.enableTodayAtChurch,
        enablePrayerWall: settings?.enablePrayerWall ?? DEFAULT_SETTINGS.enablePrayerWall,
        enablePersonalizedFeed: settings?.enablePersonalizedFeed ?? DEFAULT_SETTINGS.enablePersonalizedFeed,
        enableSermonFollowups: settings?.enableSermonFollowups ?? DEFAULT_SETTINGS.enableSermonFollowups,
      } as EngagementSettings;
    },
    enabled: !!churchId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for member portal to get settings based on member's church
export function useMemberEngagementSettings(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-engagement-settings", memberId],
    queryFn: async () => {
      if (!memberId) return DEFAULT_SETTINGS;

      // Get member's church_id
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("church_id")
        .eq("id", memberId)
        .single();

      if (memberError) throw memberError;
      if (!member) return DEFAULT_SETTINGS;

      // Get church settings
      const { data: church, error: churchError } = await supabase
        .from("churches")
        .select("settings")
        .eq("id", member.church_id)
        .single();

      if (churchError) throw churchError;

      const settings = church?.settings as Record<string, any> | null;

      return {
        enableTodayAtChurch: settings?.enableTodayAtChurch ?? DEFAULT_SETTINGS.enableTodayAtChurch,
        enablePrayerWall: settings?.enablePrayerWall ?? DEFAULT_SETTINGS.enablePrayerWall,
        enablePersonalizedFeed: settings?.enablePersonalizedFeed ?? DEFAULT_SETTINGS.enablePersonalizedFeed,
        enableSermonFollowups: settings?.enableSermonFollowups ?? DEFAULT_SETTINGS.enableSermonFollowups,
      } as EngagementSettings;
    },
    enabled: !!memberId,
    staleTime: 10 * 60 * 1000,
  });
}
