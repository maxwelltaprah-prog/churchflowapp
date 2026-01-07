import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useSendSMSCampaign() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      audienceType: string;
      audienceGroupIds?: string[];
      audienceMemberIds?: string[];
      messageBody: string;
      subject?: string;
      senderName?: string;
      recipientCount: number;
    }) => {
      if (!profile?.church_id || !user?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("send-sms-campaign", {
        body: {
          churchId: profile.church_id,
          userId: user.id,
          audienceType: data.audienceType,
          audienceGroupIds: data.audienceGroupIds,
          audienceMemberIds: data.audienceMemberIds,
          messageBody: data.messageBody,
          subject: data.subject,
          senderName: data.senderName,
          recipientCount: data.recipientCount,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sms-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["sms-delivery-summary"] });
      toast.success(`SMS campaign sent: ${data.sentCount} delivered${data.failedCount > 0 ? `, ${data.failedCount} failed` : ""}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    },
  });
}

export function useResendFailedSMS() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (!profile?.church_id || !user?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("resend-failed-sms", {
        body: {
          churchId: profile.church_id,
          campaignId,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sms-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["sms-delivery-summary"] });
      toast.success(`Resent SMS: ${data.sentCount} delivered${data.failedCount > 0 ? `, ${data.failedCount} still failed` : ""}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend SMS: ${error.message}`);
    },
  });
}
