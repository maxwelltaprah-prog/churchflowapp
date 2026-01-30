import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TithePaymentMethod = 'cash' | 'momo' | 'bank' | 'card' | 'other';
export type TithePaymentStatus = 'paid' | 'reversed' | 'pending';

export interface TithePayment {
  id: string;
  church_id: string;
  branch_id: string;
  member_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_method: TithePaymentMethod;
  reference_note: string | null;
  recorded_by_user_id: string | null;
  status: TithePaymentStatus;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    branch_id: string;
  };
  recorded_by?: {
    full_name: string | null;
  };
}

export interface TitheSettings {
  id: string;
  church_id: string;
  tithe_rate_percent: number;
  enable_pledge_targets: boolean;
  enable_reminders: boolean;
  default_currency: string;
  privacy_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface TithePaymentInput {
  member_id: string;
  branch_id: string;
  amount: number;
  currency?: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_method: TithePaymentMethod;
  reference_note?: string;
}

interface TitheFilters {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: TithePaymentMethod;
  status?: TithePaymentStatus;
  memberId?: string;
  periodMonth?: number;
  periodYear?: number;
}

export function useTithePayments(filters: TitheFilters = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["tithe-payments", profile?.church_id, filters],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("tithe_payments")
        .select(`
          *,
          member:members!tithe_payments_member_id_fkey(id, full_name, phone, email, branch_id)
        `)
        .eq("church_id", profile.church_id)
        .order("payment_date", { ascending: false });

      if (filters.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }
      if (filters.startDate) {
        query = query.gte("payment_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("payment_date", filters.endDate);
      }
      if (filters.paymentMethod) {
        query = query.eq("payment_method", filters.paymentMethod);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      } else {
        query = query.neq("status", "reversed");
      }
      if (filters.memberId) {
        query = query.eq("member_id", filters.memberId);
      }
      if (filters.periodMonth) {
        query = query.eq("period_month", filters.periodMonth);
      }
      if (filters.periodYear) {
        query = query.eq("period_year", filters.periodYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as TithePayment[];
    },
    enabled: !!profile?.church_id,
  });
}

export function useTitheSettings() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["tithe-settings", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const { data, error } = await supabase
        .from("tithe_settings")
        .select("*")
        .eq("church_id", profile.church_id)
        .maybeSingle();

      if (error) throw error;
      return data as TitheSettings | null;
    },
    enabled: !!profile?.church_id,
  });
}

export function useTitheMutations() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  const addPayment = useMutation({
    mutationFn: async (input: TithePaymentInput) => {
      if (!profile?.church_id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("tithe_payments")
        .insert({
          church_id: profile.church_id,
          branch_id: input.branch_id,
          member_id: input.member_id,
          amount: input.amount,
          currency: input.currency || "GHS",
          payment_date: input.payment_date,
          period_month: input.period_month,
          period_year: input.period_year,
          payment_method: input.payment_method,
          reference_note: input.reference_note || null,
          recorded_by_user_id: user.id,
          status: "paid",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tithe-payments"] });
      queryClient.invalidateQueries({ queryKey: ["tithe-analytics"] });
      toast.success("Tithe payment recorded successfully");
    },
    onError: (error) => {
      console.error("Error adding tithe payment:", error);
      toast.error("Failed to record tithe payment");
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...input }: TithePaymentInput & { id: string }) => {
      const { data, error } = await supabase
        .from("tithe_payments")
        .update({
          member_id: input.member_id,
          branch_id: input.branch_id,
          amount: input.amount,
          currency: input.currency,
          payment_date: input.payment_date,
          period_month: input.period_month,
          period_year: input.period_year,
          payment_method: input.payment_method,
          reference_note: input.reference_note || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tithe-payments"] });
      queryClient.invalidateQueries({ queryKey: ["tithe-analytics"] });
      toast.success("Tithe payment updated successfully");
    },
    onError: (error) => {
      console.error("Error updating tithe payment:", error);
      toast.error("Failed to update tithe payment");
    },
  });

  const reversePayment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("tithe_payments")
        .update({ status: "reversed" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tithe-payments"] });
      queryClient.invalidateQueries({ queryKey: ["tithe-analytics"] });
      toast.success("Payment reversed successfully");
    },
    onError: (error) => {
      console.error("Error reversing payment:", error);
      toast.error("Failed to reverse payment");
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<TitheSettings>) => {
      if (!profile?.church_id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("tithe_settings")
        .select("id")
        .eq("church_id", profile.church_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("tithe_settings")
          .update(settings)
          .eq("church_id", profile.church_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("tithe_settings")
          .insert({
            church_id: profile.church_id,
            ...settings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tithe-settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    },
  });

  return { addPayment, updatePayment, reversePayment, updateSettings };
}

export function useTitheAnalytics(filters: TitheFilters = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["tithe-analytics", profile?.church_id, filters],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const now = new Date();
      const currentMonth = filters.periodMonth || now.getMonth() + 1;
      const selectedYear = filters.periodYear || now.getFullYear();
      const isCurrentYear = selectedYear === now.getFullYear();

      // Get all payments for this church (excluding reversed)
      let query = supabase
        .from("tithe_payments")
        .select("*")
        .eq("church_id", profile.church_id)
        .neq("status", "reversed");

      if (filters.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }

      const { data: allPayments, error } = await query;
      if (error) throw error;

      // Get total members count
      let membersQuery = supabase
        .from("members")
        .select("id", { count: "exact" })
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (filters.branchId) {
        membersQuery = membersQuery.eq("branch_id", filters.branchId);
      }

      const { count: totalMembers } = await membersQuery;

      // For "this month" - use current month if viewing current year, otherwise use January
      const displayMonth = isCurrentYear ? now.getMonth() + 1 : 1;
      
      // Calculate metrics for the display month of the selected year
      const thisMonthPayments = allPayments?.filter(
        (p) => p.period_month === displayMonth && p.period_year === selectedYear
      ) || [];

      const selectedYearPayments = allPayments?.filter(
        (p) => p.period_year === selectedYear
      ) || [];

      const totalThisMonth = thisMonthPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      const totalThisYear = selectedYearPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      const uniquePaidMembersThisMonth = new Set(
        thisMonthPayments.map((p) => p.member_id)
      ).size;

      const paymentRateThisMonth =
        totalMembers && totalMembers > 0
          ? (uniquePaidMembersThisMonth / totalMembers) * 100
          : 0;

      const averagePaymentThisMonth =
        uniquePaidMembersThisMonth > 0
          ? totalThisMonth / uniquePaidMembersThisMonth
          : 0;

      // Monthly trend - January to December for the selected year
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyTrend: { month: string; amount: number; count: number }[] = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthPayments = allPayments?.filter(
          (p) => p.period_month === month && p.period_year === selectedYear
        ) || [];
        
        monthlyTrend.push({
          month: `${monthNames[month - 1]} ${selectedYear}`,
          amount: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          count: new Set(monthPayments.map((p) => p.member_id)).size,
        });
      }

      // Payment method breakdown for the selected year
      const methodBreakdown: Record<string, number> = {};
      selectedYearPayments?.forEach((p) => {
        methodBreakdown[p.payment_method] =
          (methodBreakdown[p.payment_method] || 0) + Number(p.amount);
      });

      // Top contributors for the selected year
      const memberTotals: Record<string, number> = {};
      selectedYearPayments.forEach((p) => {
        memberTotals[p.member_id] =
          (memberTotals[p.member_id] || 0) + Number(p.amount);
      });

      return {
        totalThisMonth,
        totalThisYear,
        uniquePaidMembersThisMonth,
        totalMembers: totalMembers || 0,
        paymentRateThisMonth,
        averagePaymentThisMonth,
        monthlyTrend,
        methodBreakdown,
        displayMonth, // Include which month is being displayed
        displayMonthName: monthNames[displayMonth - 1],
        topContributorIds: Object.entries(memberTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, total]) => ({ memberId: id, total })),
      };
    },
    enabled: !!profile?.church_id,
  });
}

export function useMemberTitheStatus(filters: TitheFilters = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["member-tithe-status", profile?.church_id, filters],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const now = new Date();
      const currentMonth = filters.periodMonth || now.getMonth() + 1;
      const currentYear = filters.periodYear || now.getFullYear();

      // Get all active members
      let membersQuery = supabase
        .from("members")
        .select("id, full_name, phone, email, branch_id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (filters.branchId) {
        membersQuery = membersQuery.eq("branch_id", filters.branchId);
      }

      const { data: members, error: membersError } = await membersQuery;
      if (membersError) throw membersError;

      // Get all tithe payments for this church
      const { data: payments, error: paymentsError } = await supabase
        .from("tithe_payments")
        .select("*")
        .eq("church_id", profile.church_id)
        .neq("status", "reversed");

      if (paymentsError) throw paymentsError;

      // Map members with their tithe status
      return members?.map((member) => {
        const memberPayments = payments?.filter((p) => p.member_id === member.id) || [];
        const thisMonthPayment = memberPayments.find(
          (p) => p.period_month === currentMonth && p.period_year === currentYear
        );
        const lastPayment = memberPayments.sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )[0];

        // Calculate YTD total
        const ytdTotal = memberPayments
          .filter((p) => p.period_year === currentYear)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        // Calculate payment consistency (months paid in last 12)
        const last12Months: { month: number; year: number }[] = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(currentYear, currentMonth - 1 - i, 1);
          last12Months.push({ month: date.getMonth() + 1, year: date.getFullYear() });
        }
        const monthsPaid = last12Months.filter((m) =>
          memberPayments.some(
            (p) => p.period_month === m.month && p.period_year === m.year
          )
        ).length;

        return {
          ...member,
          paidThisMonth: !!thisMonthPayment,
          thisMonthAmount: thisMonthPayment ? Number(thisMonthPayment.amount) : 0,
          lastPaymentDate: lastPayment?.payment_date || null,
          ytdTotal,
          monthsPaidLast12: monthsPaid,
        };
      }) || [];
    },
    enabled: !!profile?.church_id,
  });
}
