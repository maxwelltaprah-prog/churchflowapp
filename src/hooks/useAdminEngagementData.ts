import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type {
  DailyContent,
  PrayerRequest,
  SermonFollowupPlan,
  SermonFollowupDay,
} from "@/hooks/useEngagementData";

// =====================================================
// ADMIN HOOKS - For Dashboard Management
// =====================================================

// Fetch all daily content for admin
export function useAdminDailyContent() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["admin-daily-content", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("daily_church_content")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("publish_date", { ascending: false });

      if (error) throw error;
      return data as DailyContent[];
    },
    enabled: !!profile?.church_id,
  });
}

// Create daily content
export function useCreateDailyContent() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (content: Omit<DailyContent, "id" | "created_at" | "updated_at" | "created_by" | "church_id">) => {
      if (!profile?.church_id) throw new Error("No church context");

      const { data, error } = await supabase
        .from("daily_church_content")
        .insert({
          ...content,
          church_id: profile.church_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-content"] });
      toast.success("Content created successfully");
    },
    onError: () => {
      toast.error("Failed to create content");
    },
  });
}

// Update daily content
export function useUpdateDailyContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...content }: Partial<DailyContent> & { id: string }) => {
      const { data, error } = await supabase
        .from("daily_church_content")
        .update(content)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-content"] });
      toast.success("Content updated successfully");
    },
    onError: () => {
      toast.error("Failed to update content");
    },
  });
}

// Delete daily content
export function useDeleteDailyContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_church_content")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-content"] });
      toast.success("Content deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete content");
    },
  });
}

// Fetch all prayer requests for admin
export function useAdminPrayerRequests() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["admin-prayer-requests", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("prayer_requests")
        .select(`
          *,
          member:members(full_name)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PrayerRequest[];
    },
    enabled: !!profile?.church_id,
  });
}

// Update prayer request status
export function useUpdatePrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<PrayerRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("prayer_requests")
        .update({
          ...update,
          answered_at: update.is_answered ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prayer-requests"] });
      toast.success("Prayer request updated");
    },
    onError: () => {
      toast.error("Failed to update prayer request");
    },
  });
}

// Fetch all followup plans for admin
export function useAdminFollowupPlans() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["admin-followup-plans", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data: plans, error: plansError } = await supabase
        .from("sermon_followup_plans")
        .select(`
          *,
          service:services(name, service_date)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      // Get enrollment counts for each plan
      const planIds = plans?.map((p) => p.id) || [];
      if (planIds.length === 0) return [];

      const { data: enrollments } = await supabase
        .from("member_followup_enrollments")
        .select("plan_id")
        .in("plan_id", planIds);

      const enrollmentCounts: Record<string, number> = {};
      enrollments?.forEach((e) => {
        enrollmentCounts[e.plan_id] = (enrollmentCounts[e.plan_id] || 0) + 1;
      });

      return (plans || []).map((p) => ({
        ...p,
        enrollment_count: enrollmentCounts[p.id] || 0,
      })) as SermonFollowupPlan[];
    },
    enabled: !!profile?.church_id,
  });
}

// Create followup plan
export function useCreateFollowupPlan() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (plan: {
      title: string;
      description?: string;
      service_id?: string;
      duration_days: number;
      auto_enroll_attendees: boolean;
      days: Omit<SermonFollowupDay, "id" | "plan_id" | "created_at" | "updated_at">[];
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Create the plan
      const { data: createdPlan, error: planError } = await supabase
        .from("sermon_followup_plans")
        .insert({
          church_id: profile.church_id,
          title: plan.title,
          description: plan.description,
          service_id: plan.service_id || null,
          duration_days: plan.duration_days,
          auto_enroll_attendees: plan.auto_enroll_attendees,
          created_by: user?.id,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create the days
      if (plan.days.length > 0) {
        const { error: daysError } = await supabase
          .from("sermon_followup_days")
          .insert(
            plan.days.map((day) => ({
              ...day,
              plan_id: createdPlan.id,
            }))
          );

        if (daysError) throw daysError;
      }

      return createdPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-followup-plans"] });
      toast.success("Followup plan created successfully");
    },
    onError: () => {
      toast.error("Failed to create followup plan");
    },
  });
}

// Update followup plan
export function useUpdateFollowupPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<SermonFollowupPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from("sermon_followup_plans")
        .update(update)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-followup-plans"] });
      toast.success("Followup plan updated");
    },
    onError: () => {
      toast.error("Failed to update followup plan");
    },
  });
}

// Delete followup plan
export function useDeleteFollowupPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sermon_followup_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-followup-plans"] });
      toast.success("Followup plan deleted");
    },
    onError: () => {
      toast.error("Failed to delete followup plan");
    },
  });
}

// Fetch followup plan days for admin
export function useAdminFollowupPlanDays(planId: string | undefined) {
  return useQuery({
    queryKey: ["admin-followup-days", planId],
    queryFn: async () => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from("sermon_followup_days")
        .select("*")
        .eq("plan_id", planId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      return data as SermonFollowupDay[];
    },
    enabled: !!planId,
  });
}

// Add/update followup day
export function useUpsertFollowupDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: Omit<SermonFollowupDay, "id" | "created_at" | "updated_at"> & { id?: string }) => {
      if (day.id) {
        const { data, error } = await supabase
          .from("sermon_followup_days")
          .update(day)
          .eq("id", day.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("sermon_followup_days")
          .insert(day)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-followup-days", variables.plan_id] });
      toast.success("Day saved successfully");
    },
    onError: () => {
      toast.error("Failed to save day");
    },
  });
}

// Delete followup day
export function useDeleteFollowupDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase
        .from("sermon_followup_days")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return planId;
    },
    onSuccess: (planId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-followup-days", planId] });
      toast.success("Day deleted");
    },
    onError: () => {
      toast.error("Failed to delete day");
    },
  });
}

// Update engagement settings
export function useUpdateEngagementSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      enableTodayAtChurch: boolean;
      enablePrayerWall: boolean;
      enablePersonalizedFeed: boolean;
      enableSermonFollowups: boolean;
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Fetch current settings
      const { data: church, error: fetchError } = await supabase
        .from("churches")
        .select("settings")
        .eq("id", profile.church_id)
        .single();

      if (fetchError) throw fetchError;

      // Merge with existing settings
      const currentSettings = (church?.settings as Record<string, any>) || {};
      const updatedSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from("churches")
        .update({ settings: updatedSettings })
        .eq("id", profile.church_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagement-settings"] });
      queryClient.invalidateQueries({ queryKey: ["member-engagement-settings"] });
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });
}
