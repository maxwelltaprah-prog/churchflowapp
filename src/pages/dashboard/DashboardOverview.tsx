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
import { useDashboardStats, useBranchStats, useRecentActivity } from "@/hooks/useChurchData";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export default function DashboardOverview() {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: branches, isLoading: branchesLoading } = useBranchStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity();

  // Mock chart data - will be replaced with real analytics
  const weeklyAttendanceData = [
    { day: "Sun", attendance: stats?.todayCheckins || 0 },
    { day: "Mon", attendance: 0 },
    { day: "Tue", attendance: 0 },
    { day: "Wed", attendance: 0 },
    { day: "Thu", attendance: 0 },
    { day: "Fri", attendance: 0 },
    { day: "Sat", attendance: 0 },
  ];

  const branchComparisonData = branches?.map(b => ({
    name: b.name.replace(" Branch", ""),
    members: b.memberCount,
    attendance: b.todayAttendance
  })) || [];

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}! Here's what's happening.
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
          value={statsLoading ? "..." : stats?.memberCount.toLocaleString() || "0"}
          icon={Users}
          description="Across all branches"
        />
        <StatsCard
          title="Active Branches"
          value={statsLoading ? "..." : stats?.branchCount || "0"}
          icon={Building2}
          description="All branches active"
        />
        <StatsCard
          title="Services This Week"
          value={statsLoading ? "..." : stats?.serviceCount || "0"}
          icon={Calendar}
          description="Scheduled services"
        />
        <StatsCard
          title="Check-ins Today"
          value={statsLoading ? "..." : stats?.todayCheckins || "0"}
          icon={QrCode}
          description="Members checked in"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="attendance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#attendanceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
              {branchComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="attendance" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No branch data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches & Activity Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Branches Overview</h2>
            <Link to="/app/branches">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {branchesLoading ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">Loading...</div>
            ) : branches && branches.length > 0 ? (
              branches.slice(0, 4).map((branch) => (
                <BranchCard
                  key={branch.id}
                  name={branch.name}
                  location={branch.location || undefined}
                  memberCount={branch.memberCount}
                  attendanceToday={branch.todayAttendance}
                  isMain={branch.is_main_branch}
                />
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No branches yet. Create your first branch!
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your church</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : activities && activities.length > 0 ? (
              <div className="divide-y divide-border">
                {activities.map((activity, index) => (
                  <RecentActivityItem
                    key={index}
                    type={activity.type}
                    title={activity.title}
                    description={activity.description}
                    time={formatTime(activity.time)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No recent activity
              </div>
            )}
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
            <Link to="/app/members">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                <span>Add Member</span>
              </Button>
            </Link>
            <Link to="/app/services">
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
            <Link to="/app/branches">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                <span>Manage Branches</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
