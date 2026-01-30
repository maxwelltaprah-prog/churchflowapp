import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTitheAnalytics, useTitheSettings, useMemberTitheStatus } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Calendar, BarChart3, PieChart as PieChartIcon } from "lucide-react";
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
  PieChart,
  Pie,
  Legend,
} from "recharts";

const COLORS = {
  purple: 'hsl(var(--kpi-purple))',
  blue: 'hsl(var(--kpi-blue))',
  green: 'hsl(var(--kpi-green))',
  amber: 'hsl(var(--kpi-amber))',
  pink: 'hsl(var(--kpi-pink))',
};

const PIE_COLORS = ['hsl(var(--kpi-purple))', 'hsl(var(--kpi-blue))', 'hsl(var(--kpi-green))', 'hsl(var(--kpi-amber))', 'hsl(var(--kpi-pink))'];

export function TitheAnalyticsTab() {
  const currentYear = new Date().getFullYear();
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  
  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { data: analytics, isLoading } = useTitheAnalytics({
    branchId: branchFilter === "all" ? undefined : branchFilter,
    periodYear: yearFilter,
  });
  const { data: memberStatus } = useMemberTitheStatus({
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

  const formatCurrency = useCallback((amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }, [settings?.default_currency]);

  // Smart Y-axis formatter
  const formatYAxis = useCallback((value: number) => {
    if (value === 0) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  }, []);

  // Generate nice Y-axis ticks for amount charts
  const getYAxisTicks = useCallback((data: { amount: number }[]) => {
    const maxVal = Math.max(...data.map(d => d.amount), 0);
    if (maxVal === 0) return [0];
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const normalized = maxVal / magnitude;
    let step;
    if (normalized <= 1) step = 0.2 * magnitude;
    else if (normalized <= 2) step = 0.5 * magnitude;
    else if (normalized <= 5) step = magnitude;
    else step = 2 * magnitude;
    const roundedMax = Math.ceil(maxVal / step) * step;
    const tickCount = Math.min(6, Math.max(3, Math.ceil(roundedMax / step) + 1));
    return Array.from({ length: tickCount }, (_, i) => Math.round(i * step));
  }, []);

  // Calculate participation rate trend
  const participationTrend = useMemo(() => {
    return analytics?.monthlyTrend.map((month) => ({
      ...month,
      participationRate: analytics.totalMembers > 0 
        ? Number(((month.count / analytics.totalMembers) * 100).toFixed(1))
        : 0,
    })) || [];
  }, [analytics]);

  // Calculate cohort analysis
  const cohortChartData = useMemo(() => [
    { name: "Consistent (10-12 mo)", value: memberStatus?.filter((m) => m.monthsPaidLast12 >= 10).length || 0, color: COLORS.green },
    { name: "Regular (6-9 mo)", value: memberStatus?.filter((m) => m.monthsPaidLast12 >= 6 && m.monthsPaidLast12 < 10).length || 0, color: COLORS.blue },
    { name: "Occasional (1-5 mo)", value: memberStatus?.filter((m) => m.monthsPaidLast12 >= 1 && m.monthsPaidLast12 < 6).length || 0, color: COLORS.amber },
    { name: "Inactive (0 mo)", value: memberStatus?.filter((m) => m.monthsPaidLast12 === 0).length || 0, color: COLORS.pink },
  ], [memberStatus]);

  // Payment method data for pie chart
  const methodPieData = useMemo(() => {
    if (!analytics?.methodBreakdown) return [];
    return Object.entries(analytics.methodBreakdown).map(([method, amount]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: amount,
    }));
  }, [analytics?.methodBreakdown]);

  // Calculate amount distribution
  const distributionData = useMemo(() => {
    const amountBands = [
      { range: "₵0", min: 0, max: 0 },
      { range: "₵1-50", min: 1, max: 50 },
      { range: "₵51-100", min: 51, max: 100 },
      { range: "₵101-200", min: 101, max: 200 },
      { range: "₵201-500", min: 201, max: 500 },
      { range: "₵500+", min: 501, max: Infinity },
    ];
    return amountBands.map((band) => ({
      range: band.range,
      count: memberStatus?.filter((m) => {
        if (band.max === 0) return m.thisMonthAmount === 0;
        return m.thisMonthAmount >= band.min && m.thisMonthAmount <= band.max;
      }).length || 0,
    }));
  }, [memberStatus]);

  const amountYAxisTicks = useMemo(() => 
    getYAxisTicks(analytics?.monthlyTrend || []), 
    [analytics?.monthlyTrend, getYAxisTicks]
  );

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

  const tooltipStyle = { 
    backgroundColor: 'hsl(var(--card))', 
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px'
  };

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

      {/* Collection Trend - Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-kpi-purple" />
            Collection Trend ({yearFilter})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthlyTrend || []} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  ticks={amountYAxisTicks}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Amount"]}
                  contentStyle={tooltipStyle}
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
              Participation Rate ({yearFilter})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participationTrend} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.split(' ')[0]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Participation"]}
                    contentStyle={tooltipStyle}
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

        {/* Payment Method Breakdown - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-kpi-amber" />
              Payment Methods ({yearFilter})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {methodPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {methodPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)} 
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No payment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Cohorts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-kpi-green" />
              Payment Consistency (Last 12 Mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortChartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10 }}
                    width={110}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
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
              <BarChart3 className="h-5 w-5 text-kpi-pink" />
              Amount Distribution (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, "Members"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.pink}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
