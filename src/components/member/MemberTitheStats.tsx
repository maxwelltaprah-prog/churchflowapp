import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface MemberTitheStatsProps {
  memberId: string;
}

interface TithePayment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_method: string;
  status: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  KES: "KSh",
  ZAR: "R",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MemberTitheStats({ memberId }: MemberTitheStatsProps) {
  const currentYear = new Date().getFullYear();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["member-tithe-payments", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tithe_payments")
        .select("id, amount, currency, payment_date, period_month, period_year, payment_method, status")
        .eq("member_id", memberId)
        .eq("status", "paid")
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as TithePayment[];
    },
    enabled: !!memberId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Tithe History
          </CardTitle>
          <CardDescription>
            Your tithe payment records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No tithe payments recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const thisYearPayments = payments.filter(p => p.period_year === currentYear);
  const totalThisYear = thisYearPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAllTime = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const monthsPaidThisYear = new Set(thisYearPayments.map(p => p.period_month)).size;
  const lastPayment = payments[0];
  const currency = lastPayment?.currency || "GHS";
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get recent payments (last 6)
  const recentPayments = payments.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Tithe History
        </CardTitle>
        <CardDescription>
          Your tithe payment records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-kpi-purple/10 p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-kpi-purple" />
            <p className="text-2xl font-bold text-kpi-purple">
              {formatCurrency(totalThisYear)}
            </p>
            <p className="text-xs text-muted-foreground">Total in {currentYear}</p>
          </div>
          
          <div className="rounded-lg bg-kpi-green/10 p-4 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-kpi-green" />
            <p className="text-2xl font-bold text-kpi-green">
              {monthsPaidThisYear}
            </p>
            <p className="text-xs text-muted-foreground">Months Paid ({currentYear})</p>
          </div>
        </div>

        {/* Recent Payments */}
        <div>
          <h4 className="text-sm font-medium mb-3">Recent Payments</h4>
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <div 
                key={payment.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-kpi-green" />
                  <div>
                    <p className="text-sm font-medium">
                      {MONTH_NAMES[payment.period_month - 1]} {payment.period_year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.payment_date), "MMM d, yyyy")} • {payment.payment_method}
                    </p>
                  </div>
                </div>
                <p className="font-semibold">
                  {currencySymbol}{Number(payment.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* All-time total */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">All-time Total</span>
            <span className="font-bold text-lg">{formatCurrency(totalAllTime)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
