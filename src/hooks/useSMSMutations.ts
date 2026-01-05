import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useCreateSMSTemplate() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; body: string }) => {
      if (!profile?.church_id) throw new Error("No church found");

      const { error } = await supabase.from("sms_templates").insert({
        church_id: profile.church_id,
        name: data.name,
        body: data.body,
        created_by: profile.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useDeleteSMSTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("sms_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

export function useSendSMSCampaign() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      audienceType: "all_members" | "group" | "individual";
      audienceGroupIds?: string[];
      audienceMemberIds?: string[];
      messageBody: string;
      useFirstName: boolean;
      recipientCount: number;
      segments: number;
      creditsNeeded: number;
    }) => {
      if (!profile?.church_id || !user?.id) throw new Error("Not authenticated");

      // Call edge function to handle the campaign
      const { data: result, error } = await supabase.functions.invoke("send-sms-campaign", {
        body: {
          churchId: profile.church_id,
          userId: user.id,
          audienceType: data.audienceType,
          audienceGroupIds: data.audienceGroupIds,
          audienceMemberIds: data.audienceMemberIds,
          messageBody: data.messageBody,
          useFirstName: data.useFirstName,
          recipientCount: data.recipientCount,
          segments: data.segments,
          creditsNeeded: data.creditsNeeded,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
      toast.success("SMS campaign started successfully");
    },
    onError: (error) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    },
  });
}

export function useInitializeSMSWallet() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.church_id) throw new Error("No church found");

      // Check if wallet exists
      const { data: existing } = await supabase
        .from("sms_wallets")
        .select("id")
        .eq("church_id", profile.church_id)
        .maybeSingle();

      if (existing) return existing;

      // Create wallet using edge function (needs service role for insert)
      const { data, error } = await supabase.functions.invoke("manage-sms-wallet", {
        body: {
          action: "initialize",
          churchId: profile.church_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
    },
  });
}
