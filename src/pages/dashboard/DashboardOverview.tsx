import { Users, Building2, Calendar, QrCode, UserPlus, TrendingUp } from "lucide-react";
import { StatsCard, BranchCard, RecentActivityItem } from "@/components/dashboard/DashboardCards";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Mock data - will be replaced with real data from Supabase
const weeklyAttendanceData = [
  { day: "Sun", attendance: 245 },
  { day: "Mon", attendance: 45 },
  { day: "Tue", attendance: 38 },
  { day: "Wed", attendance: 120 },
  { day: "Thu", attendance: 25 },
  { day: "Fri", attendance: 85 },
  { day: "Sat", attendance: 32 },
];

const branchComparisonData = [
  { name: "Main", members: 450, attendance: 380 },
  { name: "Takoradi", members: 280, attendance: 245 },
  { name: "Cape Coast", members: 195, attendance: 168 },
  { name: "Kumasi", members: 310, attendance: 275 },
];

const recentActivities = [
  { type: "checkin" as const, title: "Sarah Johnson checked in", description: "Sunday Service - Main Branch", time: "2 min ago" },
  { type: "member" as const, title: "New member registered", description: "Michael Owusu - Takoradi Branch", time: "15 min ago" },
  { type: "checkin" as const, title: "James Mensah checked in", description: "Sunday Service - Main Branch", time: "18 min ago" },
  { type: "service" as const, title: "Service created", description: "Midweek Prayer - Cape Coast", time: "1 hour ago" },
  { type: "checkin" as const, title: "Grace Adu checked in", description: "Sunday Service - Kumasi Branch", time: "1 hour ago" },
];

const branches = [
  { name: "Main Branch", location: "Accra Central", memberCount: 450, attendanceToday: 142, isMain: true },
  { name: "Takoradi Branch", location: "Takoradi", memberCount: 280, attendanceToday: 98, isMain: false },
  { name: "Cape Coast Branch", location: "Cape Coast", memberCount: 195, attendanceToday: 67, isMain: false },
  { name: "Kumasi Branch", location: "Kumasi", memberCount: 310, attendanceToday: 105, isMain: false },
];

export default function DashboardOverview() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening across your church.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/checkin">
            <Button variant="default" size="lg">
              <QrCode className="w-4 h-4 mr-2" />
              Start Check-in
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value="1,235"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Branches"
          value="4"
          icon={Building2}
          description="All branches active"
        />
        <StatsCard
          title="Services This Week"
          value="12"
          icon={Calendar}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Check-ins Today"
          value="412"
          icon={QrCode}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Attendance
            </CardTitle>
            <CardDescription>Attendance trends across all branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyAttendanceData}>
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#attendanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Branch Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              Branch Performance
            </CardTitle>
            <CardDescription>Members vs attendance by branch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attendance" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches & Activity Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Branches Overview */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Branches Overview</h2>
            <Link to="/app/branches">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {branches.map((branch) => (
              <BranchCard key={branch.name} {...branch} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your church</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentActivities.map((activity, index) => (
                <RecentActivityItem key={index} {...activity} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/app/members/new">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                <span>Add Member</span>
              </Button>
            </Link>
            <Link to="/app/services/new">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                <span>Create Service</span>
              </Button>
            </Link>
            <Link to="/app/checkin">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <QrCode className="w-6 h-6 text-primary" />
                <span>Start Check-in</span>
              </Button>
            </Link>
            <Link to="/app/broadcasts/new">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                <span>Send Broadcast</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
