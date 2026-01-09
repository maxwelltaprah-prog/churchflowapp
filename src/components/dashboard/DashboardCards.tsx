import { Link } from "react-router-dom";
import { LucideIcon, ChevronRight, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =================== KPI Card ===================
interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  href?: string;
  isLoading?: boolean;
  change?: number;
  variant?: "default" | "purple" | "pink" | "teal" | "orange" | "blue" | "green" | "amber" | "rose";
  tooltip?: string;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  description,
  href,
  isLoading,
  change,
  variant = "default",
  tooltip
}: KPICardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    purple: "bg-kpi-purple/10 border-kpi-purple/30",
    pink: "bg-kpi-pink/10 border-kpi-pink/30",
    teal: "bg-kpi-teal/10 border-kpi-teal/30",
    orange: "bg-kpi-orange/10 border-kpi-orange/30",
    blue: "bg-kpi-blue/10 border-kpi-blue/30",
    green: "bg-kpi-green/10 border-kpi-green/30",
    amber: "bg-kpi-amber/10 border-kpi-amber/30",
    rose: "bg-kpi-rose/10 border-kpi-rose/30",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    purple: "bg-kpi-purple text-white",
    pink: "bg-kpi-pink text-white",
    teal: "bg-kpi-teal text-white",
    orange: "bg-kpi-orange text-white",
    blue: "bg-kpi-blue text-white",
    green: "bg-kpi-green text-white",
    amber: "bg-kpi-amber text-white",
    rose: "bg-kpi-rose text-white",
  };

  const valueStyles = {
    default: "text-foreground",
    purple: "text-kpi-purple",
    pink: "text-kpi-pink",
    teal: "text-kpi-teal",
    orange: "text-kpi-orange",
    blue: "text-kpi-blue",
    green: "text-kpi-green",
    amber: "text-kpi-amber",
    rose: "text-kpi-rose",
  };

  const content = (
    <div className={cn(
      "rounded-2xl border p-5 transition-all duration-200",
      variantStyles[variant],
      href && "hover:scale-[1.02] cursor-pointer"
    )}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
              {tooltip && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className={cn("p-2.5 rounded-xl", iconStyles[variant])}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold", valueStyles[variant])}>{value}</span>
            {change !== undefined && change !== 0 && (
              <span className={cn(
                "flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full",
                change > 0 ? "text-kpi-green bg-kpi-green/10" : "text-kpi-rose bg-kpi-rose/10"
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
              View details <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <Link to={href} className="group">{content}</Link>;
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
  variant?: "default" | "purple" | "pink" | "teal" | "orange" | "blue" | "green";
  tooltip?: string;
}

export function StatCard({ label, value, icon: Icon, description, change, isLoading, variant = "default", tooltip }: StatCardProps) {
  const bgStyles = {
    default: "bg-muted/50",
    purple: "bg-kpi-purple/10",
    pink: "bg-kpi-pink/10",
    teal: "bg-kpi-teal/10",
    orange: "bg-kpi-orange/10",
    blue: "bg-kpi-blue/10",
    green: "bg-kpi-green/10",
  };

  const valueStyles = {
    default: "text-foreground",
    purple: "text-kpi-purple",
    pink: "text-kpi-pink",
    teal: "text-kpi-teal",
    orange: "text-kpi-orange",
    blue: "text-kpi-blue",
    green: "text-kpi-green",
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-muted/30">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-12" />
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-xl", bgStyles[variant])}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {tooltip && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[180px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-xl font-bold", valueStyles[variant])}>{value}</span>
        {change !== undefined && change !== 0 && (
          <span className={cn(
            "text-xs font-medium",
            change > 0 ? "text-kpi-green" : "text-kpi-rose"
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
  tooltip?: string;
}

export function SectionHeader({ title, description, action, icon: Icon, tooltip }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-primary text-white">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {tooltip && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
  color?: "primary" | "purple" | "pink" | "teal" | "orange" | "blue" | "green";
}

export function ProgressBar({ label, value, max, color = "primary" }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const colorStyles = {
    primary: "bg-primary",
    purple: "bg-kpi-purple",
    pink: "bg-kpi-pink",
    teal: "bg-kpi-teal",
    orange: "bg-kpi-orange",
    blue: "bg-kpi-blue",
    green: "bg-kpi-green",
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
      "flex items-center justify-between p-3 rounded-xl bg-muted/30 transition-colors",
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
            badgeVariant === "destructive" && "bg-kpi-rose/10 text-kpi-rose",
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
