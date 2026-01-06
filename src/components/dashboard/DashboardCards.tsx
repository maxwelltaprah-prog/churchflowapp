import { Link } from "react-router-dom";
import { LucideIcon, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// =================== KPI Card ===================
interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  href?: string;
  isLoading?: boolean;
  change?: number;
  variant?: "default" | "accent" | "muted" | "success" | "warning" | "highlight";
}

export function KPICard({
  title,
  value,
  icon: Icon,
  description,
  href,
  isLoading,
  change,
  variant = "default"
}: KPICardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    accent: "bg-primary/5 border-primary/20",
    muted: "bg-muted/50 border-border",
    success: "bg-green-500/5 border-green-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    highlight: "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 shadow-md ring-1 ring-primary/10"
  };

  const content = (
    <div className={cn(
      "rounded-xl border p-5 transition-all",
      variantStyles[variant],
      href && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
    )}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{value}</span>
            {change !== undefined && change !== 0 && (
              <span className={cn(
                "flex items-center text-xs font-medium",
                change > 0 ? "text-green-600" : "text-red-500"
              )}>
                {change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {change > 0 ? "+" : ""}{change}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {href && (
            <div className="mt-3 flex items-center text-xs text-primary font-medium">
              View details <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

// =================== Stat Card (Smaller) ===================
interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  description?: string;
  change?: number;
  isLoading?: boolean;
}

export function StatCard({ label, value, icon: Icon, description, change, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-12" />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-foreground">{value}</span>
        {change !== undefined && change !== 0 && (
          <span className={cn(
            "text-xs font-medium",
            change > 0 ? "text-green-600" : "text-red-500"
          )}>
            {change > 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

// =================== Section Header ===================
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

export function SectionHeader({ title, description, action, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="p-1.5 rounded-md bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// =================== Empty State ===================
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-full bg-muted mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

// =================== Progress Bar ===================
interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: "primary" | "accent" | "success" | "warning" | "destructive";
}

export function ProgressBar({ label, value, max, color = "primary" }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const colorStyles = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-green-500",
    warning: "bg-amber-500",
    destructive: "bg-destructive"
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =================== List Item ===================
interface ListItemProps {
  name: string;
  value?: string | number;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
}

export function ListItem({ name, value, subtitle, badge, badgeVariant = "secondary", onClick, href, icon: Icon }: ListItemProps) {
  const content = (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg bg-muted/30 transition-colors",
      (onClick || href) && "hover:bg-muted cursor-pointer"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{name}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full",
            badgeVariant === "default" && "bg-primary/10 text-primary",
            badgeVariant === "secondary" && "bg-muted text-muted-foreground",
            badgeVariant === "destructive" && "bg-destructive/10 text-destructive",
            badgeVariant === "outline" && "border border-border text-muted-foreground"
          )}>
            {badge}
          </span>
        )}
        {value !== undefined && (
          <span className="text-sm font-semibold text-foreground">{value}</span>
        )}
        {(onClick || href) && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );

  if (href) return <Link to={href}>{content}</Link>;
  if (onClick) return <div onClick={onClick}>{content}</div>;
  return content;
}
