import { useTitheAnalytics, useTitheSettings } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useCallback } from "react";
import { Users, TrendingUp, Percent, Calendar, Coins } from "lucide-react";
import { KPICard } from "@/components/dashboard/DashboardCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  KES: "KSh",
  ZAR: "R",
};

export function TitheOverviewTab() {
  const currentYear = new Date().getFullYear();
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  
  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { data: analytics, isLoading } = useTitheAnalytics({
    branchId: branchFilter === "all" ? undefined : branchFilter,
    periodYear: yearFilter,
  });

  // Generate year options (current year and 5 years back)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  const currencySymbol = CURRENCY_SYMBOLS[settings?.default_currency || "GHS"] || "₵";

  const formatCurrency = useCallback((amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [settings?.default_currency]);

  // Smart Y-axis formatter that handles various ranges
  const formatYAxis = useCallback((value: number) => {
    if (value === 0) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  }, []);

  // Calculate max value for better Y-axis scaling
  const maxAmount = useMemo(() => {
    if (!analytics?.monthlyTrend) return 0;
    return Math.max(...analytics.monthlyTrend.map(m => m.amount), 0);
  }, [analytics?.monthlyTrend]);

  // Generate nice Y-axis ticks
  const yAxisTicks = useMemo(() => {
    if (maxAmount === 0) return [0];
    const step = Math.pow(10, Math.floor(Math.log10(maxAmount)));
    const roundedMax = Math.ceil(maxAmount / step) * step;
    const tickCount = 5;
    const tickStep = roundedMax / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => Math.round(i * tickStep));
  }, [maxAmount]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border p-5 bg-card">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches?.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter.toString()} onValueChange={(val) => setYearFilter(parseInt(val))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards - Dashboard Style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={analytics?.displayMonthName ? `Total in ${analytics.displayMonthName}` : "Total This Month"}
          value={settings?.privacy_mode ? "••••••" : formatCurrency(analytics?.totalThisMonth || 0)}
          icon={Coins}
          variant="purple"
          tooltip={`Total tithe collected in ${analytics?.displayMonthName || 'this month'} ${yearFilter}`}
        />

        <KPICard
          title={`Total in ${yearFilter}`}
          value={settings?.privacy_mode ? "••••••" : formatCurrency(analytics?.totalThisYear || 0)}
          icon={Calendar}
          variant="blue"
          tooltip={`Total tithe collected for the year ${yearFilter}`}
        />

        <KPICard
          title="Payment Rate"
          value={`${analytics?.paymentRateThisMonth?.toFixed(1) || 0}%`}
          icon={Percent}
          variant="green"
          description={`${analytics?.uniquePaidMembersThisMonth || 0} of ${analytics?.totalMembers || 0} members paid`}
          tooltip={`Percentage of members who paid in ${analytics?.displayMonthName || 'this month'}`}
        />

        <KPICard
          title="Average Payment"
          value={settings?.privacy_mode ? "••••••" : formatCurrency(analytics?.averagePaymentThisMonth || 0)}
          icon={TrendingUp}
          variant="amber"
          description={`Per paying member in ${analytics?.displayMonthName || 'this month'}`}
          tooltip="Average tithe amount per paying member"
        />
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Tithe Collection ({yearFilter})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.monthlyTrend || []} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => value.split(' ')[0]}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatYAxis}
                  ticks={yAxisTicks}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Amount"]}
                  labelFormatter={(label) => label}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(var(--kpi-purple))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Paying vs Non-paying Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Member Payment Status (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-kpi-green/20 flex items-center justify-center">
                <Users className="h-8 w-8 text-kpi-green" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics?.uniquePaidMembersThisMonth || 0}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(analytics?.totalMembers || 0) - (analytics?.uniquePaidMembersThisMonth || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Not Paid</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
