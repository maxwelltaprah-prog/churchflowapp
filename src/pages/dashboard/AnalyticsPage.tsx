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
      borderColor: "border-l-primary",
      bgGradient: "from-primary/5",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Demographics",
      description: "Age, gender, and membership breakdown",
      icon: Users,
      href: "/app/analytics/demographics",
      borderColor: "border-l-amber-500",
      bgGradient: "from-amber-500/5",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      title: "Member Growth",
      description: "Acquisition and retention trends",
      icon: TrendingUp,
      href: "/app/analytics/members",
      borderColor: "border-l-emerald-500",
      bgGradient: "from-emerald-500/5",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      title: "Groups & Ministries",
      description: "Group participation and engagement",
      icon: Users,
      href: "/app/analytics/groups",
      borderColor: "border-l-violet-500",
      bgGradient: "from-violet-500/5",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      title: "Service Quality",
      description: "Operational metrics and data completeness",
      icon: Activity,
      href: "/app/analytics/quality",
      borderColor: "border-l-sky-500",
      bgGradient: "from-sky-500/5",
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-600",
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
            className={`group border-l-4 ${module.borderColor} bg-gradient-to-r ${module.bgGradient} to-transparent hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer`}
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
