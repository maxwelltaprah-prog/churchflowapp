import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSMSWallet() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["sms-wallet", churchId],
    queryFn: async () => {
      if (!churchId) return null;
      
      const { data, error } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", churchId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
  });
}

export function useSMSTemplates() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["sms-templates", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("church_id", churchId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!churchId,
  });
}

export function useSMSCampaigns() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["sms-campaigns", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      
      const { data, error } = await supabase
        .from("sms_campaigns")
        .select("*")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!churchId,
  });
}

export function useSMSCreditPurchases() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["sms-credit-purchases", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      
      const { data, error } = await supabase
        .from("sms_credit_purchases")
        .select("*")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!churchId,
  });
}

export function useMembersWithPhone() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["members-with-phone", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone, member_type, branch_id, approval_status")
        .eq("church_id", churchId)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .not("phone", "is", null)
        .order("full_name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!churchId,
  });
}

// Hook for SMS jobs with delivery status tracking
export function useSMSJobsByCampaign(campaignId: string | null) {
  const { profile } = useAuth();
  const churchId = profile?.church_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sms-jobs", campaignId],
    queryFn: async () => {
      if (!campaignId || !churchId) return [];
      
      const { data, error } = await supabase
        .from("sms_jobs")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!campaignId && !!churchId,
  });

  // Subscribe to real-time updates for delivery status
  useEffect(() => {
    if (!campaignId || !churchId) return;

    const channel = supabase
      .channel(`sms-jobs-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sms_jobs",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          // Refetch jobs when delivery status updates
          queryClient.invalidateQueries({ queryKey: ["sms-jobs", campaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, churchId, queryClient]);

  return query;
}

// Hook for delivery status summary
export function useDeliveryStatusSummary() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["delivery-status-summary", churchId],
    queryFn: async () => {
      if (!churchId) return { delivered: 0, pending: 0, failed: 0, sent: 0 };
      
      const { data, error } = await supabase
        .from("sms_jobs")
        .select("delivery_status, status")
        .eq("church_id", churchId);

      if (error) throw error;
      
      const summary = {
        delivered: 0,
        pending: 0,
        failed: 0,
        sent: 0,
      };

      (data ?? []).forEach((job: { delivery_status?: string; status: string }) => {
        const dlrStatus = job.delivery_status || "pending";
        if (dlrStatus === "delivered") summary.delivered++;
        else if (dlrStatus === "failed" || dlrStatus === "undelivered" || job.status === "failed") summary.failed++;
        else if (job.status === "sent") summary.sent++;
        else summary.pending++;
      });

      return summary;
    },
    enabled: !!churchId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!churchId) return;

    const channel = supabase
      .channel("sms-jobs-delivery")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sms_jobs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["delivery-status-summary", churchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [churchId, queryClient]);

  return query;
}
