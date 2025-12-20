import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { useDashboardStats } from "@/hooks/useChurchData";
import { useAttendanceTrends, useMemberGrowth, useBranchComparison, useServiceAttendance } from "@/hooks/useAnalyticsData";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(280 65% 60%)"];

export default function AnalyticsPage() {
  const [attendancePeriod, setAttendancePeriod] = useState<"week" | "month" | "year">("month");
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: attendanceTrends, isLoading: trendsLoading } = useAttendanceTrends(attendancePeriod);
  const { data: memberGrowth, isLoading: growthLoading } = useMemberGrowth();
  const { data: branchComparison, isLoading: branchLoading } = useBranchComparison();
  const { data: serviceAttendance, isLoading: serviceLoading } = useServiceAttendance();

  const summaryCards = [
    {
      title: "Total Members",
      value: stats?.memberCount || 0,
      icon: Users,
      change: "+12%",
      trend: "up",
    },
    {
      title: "Total Branches",
      value: stats?.branchCount || 0,
      icon: BarChart3,
      change: "+2",
      trend: "up",
    },
    {
      title: "This Month Attendance",
      value: stats?.todayCheckins || 0,
      icon: Calendar,
      change: "+8%",
      trend: "up",
    },
    {
      title: "Avg. Attendance Rate",
      value: stats?.memberCount ? `${Math.round((stats.todayCheckins / stats.memberCount) * 100)}%` : "0%",
      icon: TrendingUp,
      change: "+5%",
      trend: "up",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Track attendance trends and member growth</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-accent">
                {card.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance Trends</TabsTrigger>
          <TabsTrigger value="members">Member Growth</TabsTrigger>
          <TabsTrigger value="branches">Branch Comparison</TabsTrigger>
          <TabsTrigger value="services">Service Analysis</TabsTrigger>
        </TabsList>

        {/* Attendance Trends */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Track attendance over time</CardDescription>
              </div>
              <Select value={attendancePeriod} onValueChange={(v) => setAttendancePeriod(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 4 weeks</SelectItem>
                  <SelectItem value="month">Last 3 months</SelectItem>
                  <SelectItem value="year">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : attendanceTrends && attendanceTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No attendance data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Growth */}
        <TabsContent value="members" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
                <CardDescription>Cumulative member count over time</CardDescription>
              </CardHeader>
              <CardContent>
                {growthLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : memberGrowth && memberGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={memberGrowth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line
                        type="monotone"
                        dataKey="members"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--accent))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No member data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Members</CardTitle>
                <CardDescription>Monthly new member registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {growthLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : memberGrowth && memberGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={memberGrowth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="newMembers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No member data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branch Comparison */}
        <TabsContent value="branches" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Members by Branch</CardTitle>
                <CardDescription>Distribution of members across branches</CardDescription>
              </CardHeader>
              <CardContent>
                {branchLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : branchComparison && branchComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={branchComparison}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="members"
                      >
                        {branchComparison.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No branch data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branch Attendance (Last 30 Days)</CardTitle>
                <CardDescription>Total attendance by branch</CardDescription>
              </CardHeader>
              <CardContent>
                {branchLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : branchComparison && branchComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="attendance" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No attendance data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Service Analysis */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Attendance</CardTitle>
              <CardDescription>Attendance for recent services</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : serviceAttendance && serviceAttendance.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={serviceAttendance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No service data available yet. Create services and record attendance to see analytics.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
