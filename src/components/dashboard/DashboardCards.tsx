import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-6 shadow-soft hover:shadow-card transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">vs last week</span>
            </div>
          )}
          {description && !trend && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

interface BranchCardProps {
  name: string;
  location?: string;
  memberCount: number;
  attendanceToday: number;
  isMain?: boolean;
}

export function BranchCard({ name, location, memberCount, attendanceToday, isMain }: BranchCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-card transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{name}</h3>
            {isMain && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                Main
              </span>
            )}
          </div>
          {location && (
            <p className="text-sm text-muted-foreground mt-0.5">{location}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary">{memberCount}</p>
          <p className="text-xs text-muted-foreground">Members</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-accent">{attendanceToday}</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
      </div>
    </div>
  );
}

interface RecentActivityItemProps {
  type: "checkin" | "member" | "service";
  title: string;
  description: string;
  time: string;
}

export function RecentActivityItem({ type, title, description, time }: RecentActivityItemProps) {
  const colors = {
    checkin: "bg-green-500",
    member: "bg-blue-500",
    service: "bg-purple-500",
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn("w-2 h-2 rounded-full mt-2", colors[type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
    </div>
  );
}
