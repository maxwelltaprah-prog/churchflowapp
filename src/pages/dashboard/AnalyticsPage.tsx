import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  ArrowRight,
  BarChart3,
  Activity,
} from "lucide-react";

export default function AnalyticsPage() {
  const analyticsModules = [
    {
      title: "Attendance Analytics",
      description: "Service attendance patterns and trends",
      icon: BarChart3,
      href: "/app/analytics/attendance",
      bgColor: "bg-kpi-purple/10",
      borderColor: "border-kpi-purple/20",
      hoverBg: "hover:bg-kpi-purple/15",
      iconBg: "bg-kpi-purple/20",
      iconColor: "text-kpi-purple",
    },
    {
      title: "Demographics",
      description: "Age, gender, and membership breakdown",
      icon: Users,
      href: "/app/analytics/demographics",
      bgColor: "bg-kpi-amber/10",
      borderColor: "border-kpi-amber/20",
      hoverBg: "hover:bg-kpi-amber/15",
      iconBg: "bg-kpi-amber/20",
      iconColor: "text-kpi-amber",
    },
    {
      title: "Member Growth",
      description: "Acquisition and retention trends",
      icon: TrendingUp,
      href: "/app/analytics/members",
      bgColor: "bg-kpi-green/10",
      borderColor: "border-kpi-green/20",
      hoverBg: "hover:bg-kpi-green/15",
      iconBg: "bg-kpi-green/20",
      iconColor: "text-kpi-green",
    },
    {
      title: "Groups & Ministries",
      description: "Group participation and engagement",
      icon: Users,
      href: "/app/analytics/groups",
      bgColor: "bg-kpi-pink/10",
      borderColor: "border-kpi-pink/20",
      hoverBg: "hover:bg-kpi-pink/15",
      iconBg: "bg-kpi-pink/20",
      iconColor: "text-kpi-pink",
    },
    {
      title: "Service Quality",
      description: "Operational metrics and data completeness",
      icon: Activity,
      href: "/app/analytics/quality",
      bgColor: "bg-kpi-teal/10",
      borderColor: "border-kpi-teal/20",
      hoverBg: "hover:bg-kpi-teal/15",
      iconBg: "bg-kpi-teal/20",
      iconColor: "text-kpi-teal",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">
          Explore insights across attendance, demographics, and engagement
        </p>
      </div>

      {/* Analytics Module Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {analyticsModules.map((module) => (
          <Card 
            key={module.title} 
            className={`group ${module.bgColor} ${module.borderColor} ${module.hoverBg} hover:-translate-y-0.5 transition-all cursor-pointer`}
          >
            <Link to={module.href}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${module.iconBg}`}>
                    <module.icon className={`h-5 w-5 ${module.iconColor}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base mt-3">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
