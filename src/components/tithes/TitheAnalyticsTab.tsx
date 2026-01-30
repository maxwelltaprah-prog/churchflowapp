import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTitheAnalytics, useTitheSettings, useMemberTitheStatus } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, Calendar, BarChart3 } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from "recharts";

const COLORS = {
  purple: 'hsl(var(--kpi-purple))',
  blue: 'hsl(var(--kpi-blue))',
  green: 'hsl(var(--kpi-green))',
  amber: 'hsl(var(--kpi-amber))',
  pink: 'hsl(var(--kpi-pink))',
};

export function TitheAnalyticsTab() {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { data: analytics, isLoading } = useTitheAnalytics({
    branchId: branchFilter === "all" ? undefined : branchFilter,
  });
  const { data: memberStatus } = useMemberTitheStatus({
    branchId: branchFilter === "all" ? undefined : branchFilter,
  });

  const formatCurrency = (amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate participation rate trend
  const participationTrend = analytics?.monthlyTrend.map((month) => ({
    ...month,
    participationRate: analytics.totalMembers > 0 
      ? ((month.count / analytics.totalMembers) * 100).toFixed(1)
      : 0,
  }));

  // Calculate cohort analysis
  const cohortData = {
    consistent: memberStatus?.filter((m) => m.monthsPaidLast12 >= 10).length || 0,
    regular: memberStatus?.filter((m) => m.monthsPaidLast12 >= 6 && m.monthsPaidLast12 < 10).length || 0,
    occasional: memberStatus?.filter((m) => m.monthsPaidLast12 >= 1 && m.monthsPaidLast12 < 6).length || 0,
    inactive: memberStatus?.filter((m) => m.monthsPaidLast12 === 0).length || 0,
  };

  const cohortChartData = [
    { name: "Consistent (10-12)", value: cohortData.consistent, color: COLORS.green },
    { name: "Regular (6-9)", value: cohortData.regular, color: COLORS.blue },
    { name: "Occasional (1-5)", value: cohortData.occasional, color: COLORS.amber },
    { name: "Inactive (0)", value: cohortData.inactive, color: COLORS.pink },
  ];

  // Calculate amount distribution
  const amountBands = [
    { range: "0", min: 0, max: 0 },
    { range: "1-50", min: 1, max: 50 },
    { range: "51-100", min: 51, max: 100 },
    { range: "101-200", min: 101, max: 200 },
    { range: "201-500", min: 201, max: 500 },
    { range: "500+", min: 501, max: Infinity },
  ];

  const distributionData = amountBands.map((band) => ({
    range: band.range,
    count: memberStatus?.filter((m) => {
      if (band.max === 0) return m.thisMonthAmount === 0;
      return m.thisMonthAmount >= band.min && m.thisMonthAmount <= band.max;
    }).length || 0,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
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
      </div>

      {/* Collection Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-kpi-purple" />
            Monthly Collection Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthlyTrend || []}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.split(' ')[0]}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Amount"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke={COLORS.purple}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Participation Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-kpi-blue" />
              Participation Rate by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participationTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Participation"]}
                  />
                  <Bar 
                    dataKey="participationRate" 
                    fill={COLORS.blue}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Member Cohorts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-kpi-green" />
              Member Payment Cohorts (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {cohortChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Amount Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-kpi-amber" />
              Amount Distribution (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, "Members"]}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.amber}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Method Breakdown (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics?.methodBreakdown || {}).map(([method, amount]) => {
                const total = Object.values(analytics?.methodBreakdown || {}).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (amount / total) * 100 : 0;
                
                return (
                  <div key={method} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium">{method}</span>
                      <span className="text-muted-foreground">
                        {settings?.privacy_mode ? `${percentage.toFixed(1)}%` : formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-kpi-purple rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(analytics?.methodBreakdown || {}).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No payment data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
