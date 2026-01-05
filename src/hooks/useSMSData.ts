import { useQuery } from "@tanstack/react-query";
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
