import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTitheAnalytics, useTitheSettings } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { DollarSign, Users, TrendingUp, Percent, Calendar } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['hsl(var(--kpi-purple))', 'hsl(var(--kpi-blue))', 'hsl(var(--kpi-green))', 'hsl(var(--kpi-amber))', 'hsl(var(--kpi-pink))'];

export function TitheOverviewTab() {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { data: analytics, isLoading } = useTitheAnalytics({
    branchId: branchFilter === "all" ? undefined : branchFilter,
  });

  const formatCurrency = (amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const methodBreakdownData = analytics?.methodBreakdown
    ? Object.entries(analytics.methodBreakdown).map(([method, amount]) => ({
        name: method.charAt(0).toUpperCase() + method.slice(1),
        value: amount,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-kpi-purple">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-kpi-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.privacy_mode ? "••••••" : formatCurrency(analytics?.totalThisMonth || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-kpi-blue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total This Year
            </CardTitle>
            <Calendar className="h-4 w-4 text-kpi-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.privacy_mode ? "••••••" : formatCurrency(analytics?.totalThisYear || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-kpi-green">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Rate
            </CardTitle>
            <Percent className="h-4 w-4 text-kpi-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.paymentRateThisMonth?.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.uniquePaidMembersThisMonth} of {analytics?.totalMembers} members paid
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-kpi-amber">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Payment
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-kpi-amber" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.privacy_mode ? "••••••" : formatCurrency(analytics?.averagePaymentThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per paying member this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Tithe Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.monthlyTrend || []}>
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
                    labelFormatter={(label) => label}
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

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {methodBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {methodBreakdownData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
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
      </div>

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
