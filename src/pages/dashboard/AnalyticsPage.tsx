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
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Demographics",
      description: "Age, gender, and membership breakdown",
      icon: Users,
      href: "/app/analytics/demographics",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Member Growth",
      description: "Acquisition and retention trends",
      icon: TrendingUp,
      href: "/app/analytics/members",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Groups & Ministries",
      description: "Group participation and engagement",
      icon: Users,
      href: "/app/analytics/groups",
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Service Quality",
      description: "Operational metrics and data completeness",
      icon: Activity,
      href: "/app/analytics/quality",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
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
            className="group hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Link to={module.href}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${module.bgColor}`}>
                    <module.icon className={`h-5 w-5 ${module.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
