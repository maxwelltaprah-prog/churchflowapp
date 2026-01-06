import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreateVisitorData {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address?: string;
  gender?: "male" | "female" | "prefer_not_to_say";
  date_of_birth?: string;
  first_visit_date: string;
  how_heard: "friend_family" | "social_media" | "walk_in" | "outreach" | "other";
  branch_id: string;
}

interface UpdateVisitorData extends CreateVisitorData {
  id: string;
}

interface CreateFollowupData {
  visitor_id: string;
  followup_date: string;
  followup_type: "sms" | "phone_call" | "visit" | "other";
  notes?: string;
}

export function useCreateVisitor() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVisitorData) => {
      if (!profile?.church_id) throw new Error("No church ID");

      const { data: visitor, error } = await supabase
        .from("visitors")
        .insert({
          ...data,
          church_id: profile.church_id,
          created_by: user?.id,
          status: "new",
        })
        .select()
        .single();

      if (error) throw error;
      return visitor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast({ title: "Visitor registered successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to register visitor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateVisitor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateVisitorData) => {
      const { data: visitor, error } = await supabase
        .from("visitors")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return visitor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor"] });
      toast({ title: "Visitor updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update visitor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteVisitor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (visitorId: string) => {
      const { error } = await supabase
        .from("visitors")
        .delete()
        .eq("id", visitorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast({ title: "Visitor deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete visitor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateFollowup() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateFollowupData) => {
      if (!profile?.church_id) throw new Error("No church ID");

      // Create the followup
      const { data: followup, error } = await supabase
        .from("visitor_followups")
        .insert({
          ...data,
          church_id: profile.church_id,
          conducted_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update visitor status to in_follow_up if it's currently new
      const { error: updateError } = await supabase
        .from("visitors")
        .update({ status: "in_follow_up" })
        .eq("id", data.visitor_id)
        .eq("status", "new");

      if (updateError) console.error("Failed to update visitor status:", updateError);

      return followup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-followups"] });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast({ title: "Follow-up recorded successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to record follow-up",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFollowup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (followupId: string) => {
      const { error } = await supabase
        .from("visitor_followups")
        .delete()
        .eq("id", followupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-followups"] });
      toast({ title: "Follow-up deleted" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete follow-up",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useConvertToMember() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (visitor: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      email: string | null;
      address: string | null;
      how_heard: "friend_family" | "social_media" | "walk_in" | "outreach" | "other";
      branch_id: string;
    }) => {
      if (!profile?.church_id) throw new Error("No church ID");

      // Get church slug for member code generation
      const { data: church, error: churchError } = await supabase
        .from("churches")
        .select("slug")
        .eq("id", profile.church_id)
        .single();

      if (churchError) throw churchError;

      // Generate member code
      const { data: memberCode, error: codeError } = await supabase
        .rpc("generate_member_code", { _church_slug: church.slug });

      if (codeError) throw codeError;

      // Create member record
      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          church_id: profile.church_id,
          branch_id: visitor.branch_id,
          full_name: `${visitor.first_name} ${visitor.last_name}`,
          phone: visitor.phone,
          email: visitor.email,
          residential_area: visitor.address,
          how_heard: visitor.how_heard,
          member_code: memberCode,
          qr_code_token: crypto.randomUUID(),
          registered_by: user?.id,
          approval_status: "approved",
          membership_status: "active",
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Update visitor status to converted
      const { error: updateError } = await supabase
        .from("visitors")
        .update({
          status: "converted",
          converted_member_id: member.id,
        })
        .eq("id", visitor.id);

      if (updateError) throw updateError;

      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Visitor converted to member successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to convert visitor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRecordVisitorCheckin() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      visitor_id,
      service_id,
      checkin_method = "manual",
    }: {
      visitor_id: string;
      service_id: string;
      checkin_method?: "qr" | "manual";
    }) => {
      if (!profile?.church_id) throw new Error("No church ID");

      const { data, error } = await supabase
        .from("visitor_checkins")
        .insert({
          church_id: profile.church_id,
          visitor_id,
          service_id,
          checkin_method,
          checked_in_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Visitor already checked in for this service");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
    },
    onError: (error) => {
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useFindVisitorByPhone() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (phone: string) => {
      if (!profile?.church_id) throw new Error("No church ID");

      const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "").trim();

      const { data, error } = await supabase
        .from("visitors")
        .select("id, first_name, last_name, phone, branch_id")
        .eq("church_id", profile.church_id);

      if (error) throw error;

      // Find matching visitor
      const visitor = data?.find((v) => {
        const visitorPhone = v.phone?.replace(/[\s\-\(\)]/g, "").trim() || "";
        return (
          visitorPhone === normalizedPhone ||
          visitorPhone.endsWith(normalizedPhone) ||
          normalizedPhone.endsWith(visitorPhone)
        );
      });

      if (!visitor) {
        throw new Error("Visitor not found. Please check the phone number.");
      }

      return visitor;
    },
  });
}
