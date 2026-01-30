import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for engagement features
export interface DailyContent {
  id: string;
  church_id: string;
  branch_id: string | null;
  title: string;
  content: string;
  content_type: "devotional" | "announcement" | "encouragement" | "scripture";
  media_url: string | null;
  publish_date: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrayerRequest {
  id: string;
  church_id: string;
  branch_id: string | null;
  member_id: string | null;
  request_text: string;
  is_anonymous: boolean;
  is_public: boolean;
  is_answered: boolean;
  answered_at: string | null;
  status: "active" | "answered" | "archived";
  created_at: string;
  updated_at: string;
  member?: {
    full_name: string;
  } | null;
  prayer_count?: number;
}

export interface PrayerInteraction {
  id: string;
  prayer_request_id: string;
  member_id: string;
  interaction_type: "prayed" | "encouraged";
  created_at: string;
}

export interface SermonFollowupPlan {
  id: string;
  church_id: string;
  service_id: string | null;
  title: string;
  description: string | null;
  duration_days: number;
  is_active: boolean;
  auto_enroll_attendees: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  service?: {
    name: string;
    service_date: string;
  } | null;
  days?: SermonFollowupDay[];
  enrollment_count?: number;
}

export interface SermonFollowupDay {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  content: string;
  scripture_reference: string | null;
  reflection_prompt: string | null;
  action_item: string | null;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberFollowupEnrollment {
  id: string;
  plan_id: string;
  member_id: string;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: "enrolled" | "in_progress" | "completed" | "abandoned";
  plan?: SermonFollowupPlan;
  progress?: MemberFollowupProgress[];
}

export interface MemberFollowupProgress {
  id: string;
  enrollment_id: string;
  day_id: string;
  completed_at: string;
  reflection_response: string | null;
}

// =====================================================
// MEMBER HOOKS - For Member Portal
// =====================================================

// Fetch today's content for members
export function useTodayContent(memberId: string | undefined) {
  return useQuery({
    queryKey: ["today-content", memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("daily_church_content")
        .select("*")
        .eq("is_published", true)
        .lte("publish_date", today)
        .order("publish_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DailyContent | null;
    },
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch public prayer requests for members
export function usePrayerRequests(memberId: string | undefined) {
  return useQuery({
    queryKey: ["prayer-requests", memberId],
    queryFn: async () => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("prayer_requests")
        .select(`
          *,
          member:members(full_name)
        `)
        .eq("is_public", true)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get prayer counts for each request
      const requestIds = data?.map((r) => r.id) || [];
      if (requestIds.length === 0) return [];

      const { data: interactions } = await supabase
        .from("prayer_interactions")
        .select("prayer_request_id")
        .in("prayer_request_id", requestIds);

      const prayerCounts: Record<string, number> = {};
      interactions?.forEach((i) => {
        prayerCounts[i.prayer_request_id] = (prayerCounts[i.prayer_request_id] || 0) + 1;
      });

      return (data || []).map((r) => ({
        ...r,
        prayer_count: prayerCounts[r.id] || 0,
      })) as PrayerRequest[];
    },
    enabled: !!memberId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Check if member has prayed for a request
export function useMemberPrayerInteractions(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-prayer-interactions", memberId],
    queryFn: async () => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("prayer_interactions")
        .select("prayer_request_id")
        .eq("member_id", memberId);

      if (error) throw error;
      return data?.map((i) => i.prayer_request_id) || [];
    },
    enabled: !!memberId,
  });
}

// Add prayer interaction
export function useAddPrayerInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prayerRequestId,
      memberId,
    }: {
      prayerRequestId: string;
      memberId: string;
    }) => {
      const { data, error } = await supabase
        .from("prayer_interactions")
        .insert({
          prayer_request_id: prayerRequestId,
          member_id: memberId,
          interaction_type: "prayed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prayer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["member-prayer-interactions", variables.memberId] });
      toast.success("Prayer recorded 🙏");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.info("You've already prayed for this request");
      } else {
        toast.error("Failed to record prayer");
      }
    },
  });
}

// Submit prayer request
export function useSubmitPrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      churchId,
      branchId,
      memberId,
      requestText,
      isAnonymous,
      isPublic,
    }: {
      churchId: string;
      branchId: string | null;
      memberId: string;
      requestText: string;
      isAnonymous: boolean;
      isPublic: boolean;
    }) => {
      const { data, error } = await supabase
        .from("prayer_requests")
        .insert({
          church_id: churchId,
          branch_id: branchId,
          member_id: memberId,
          request_text: requestText,
          is_anonymous: isAnonymous,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-requests"] });
      toast.success("Prayer request submitted");
    },
    onError: () => {
      toast.error("Failed to submit prayer request");
    },
  });
}

// Fetch member's followup enrollments
export function useMemberEnrollments(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-enrollments", memberId],
    queryFn: async () => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("member_followup_enrollments")
        .select(`
          *,
          plan:sermon_followup_plans(
            id,
            title,
            description,
            duration_days,
            service:services(name, service_date)
          )
        `)
        .eq("member_id", memberId)
        .in("status", ["enrolled", "in_progress"])
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return data as MemberFollowupEnrollment[];
    },
    enabled: !!memberId,
  });
}

// Fetch followup plan details with days
export function useFollowupPlanDetails(planId: string | undefined) {
  return useQuery({
    queryKey: ["followup-plan-details", planId],
    queryFn: async () => {
      if (!planId) return null;

      const { data: plan, error: planError } = await supabase
        .from("sermon_followup_plans")
        .select(`
          *,
          service:services(name, service_date)
        `)
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      const { data: days, error: daysError } = await supabase
        .from("sermon_followup_days")
        .select("*")
        .eq("plan_id", planId)
        .order("day_number", { ascending: true });

      if (daysError) throw daysError;

      return { ...plan, days } as SermonFollowupPlan;
    },
    enabled: !!planId,
  });
}

// Fetch member's progress for an enrollment
export function useMemberProgress(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ["member-progress", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return [];

      const { data, error } = await supabase
        .from("member_followup_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId);

      if (error) throw error;
      return data as MemberFollowupProgress[];
    },
    enabled: !!enrollmentId,
  });
}

// Complete a followup day
export function useCompleteFollowupDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      dayId,
      reflectionResponse,
    }: {
      enrollmentId: string;
      dayId: string;
      reflectionResponse?: string;
    }) => {
      const { data, error } = await supabase
        .from("member_followup_progress")
        .insert({
          enrollment_id: enrollmentId,
          day_id: dayId,
          reflection_response: reflectionResponse,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member-progress", variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ["member-enrollments"] });
      toast.success("Day completed! 🎉");
    },
    onError: () => {
      toast.error("Failed to save progress");
    },
  });
}

// Enroll in a followup plan
export function useEnrollInPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      memberId,
    }: {
      planId: string;
      memberId: string;
    }) => {
      const { data, error } = await supabase
        .from("member_followup_enrollments")
        .insert({
          plan_id: planId,
          member_id: memberId,
          status: "enrolled",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["available-followup-plans"] });
      toast.success("Enrolled successfully!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.info("You're already enrolled in this plan");
      } else {
        toast.error("Failed to enroll");
      }
    },
  });
}

// Fetch available followup plans (not enrolled)
export function useAvailableFollowupPlans(memberId: string | undefined) {
  return useQuery({
    queryKey: ["available-followup-plans", memberId],
    queryFn: async () => {
      if (!memberId) return [];

      // First get the member's enrolled plan IDs
      const { data: enrollments } = await supabase
        .from("member_followup_enrollments")
        .select("plan_id")
        .eq("member_id", memberId);

      const enrolledPlanIds = enrollments?.map((e) => e.plan_id) || [];

      // Get active plans not enrolled in
      let query = supabase
        .from("sermon_followup_plans")
        .select(`
          *,
          service:services(name, service_date)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (enrolledPlanIds.length > 0) {
        query = query.not("id", "in", `(${enrolledPlanIds.join(",")})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SermonFollowupPlan[];
    },
    enabled: !!memberId,
  });
}
