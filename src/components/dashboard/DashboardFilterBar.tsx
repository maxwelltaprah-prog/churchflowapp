import { Building2, CalendarDays, RefreshCw, QrCode, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { format, parseISO, isToday } from "date-fns";
import { DateRange } from "@/hooks/useDashboardData";

interface Branch {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  start_time?: string;
  service_date?: string;
  branches?: { name: string } | null;
}

interface DashboardFilterBarProps {
  branches: Branch[];
  services: Service[];
  selectedBranchId?: string;
  selectedServiceId?: string;
  dateRange: DateRange;
  onBranchChange: (branchId: string | undefined) => void;
  onServiceChange: (serviceId: string | undefined) => void;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  showBranchFilter: boolean;
  isLoading?: boolean;
}

// Helper to format service display name with differentiation
function formatServiceDisplay(service: Service): string {
  const parts: string[] = [service.name];
  
  // Add time if available
  if (service.start_time) {
    parts.push(`@ ${service.start_time.slice(0, 5)}`);
  }
  
  // Add date if not today
  if (service.service_date) {
    const serviceDate = parseISO(service.service_date);
    if (!isToday(serviceDate)) {
      parts.push(`• ${format(serviceDate, "MMM d")}`);
    }
  }
  
  // Add branch if available
  if (service.branches?.name) {
    parts.push(`(${service.branches.name.replace(" Branch", "")})`);
  }
  
  return parts.join(" ");
}

export function DashboardFilterBar({
  branches,
  services,
  selectedBranchId,
  selectedServiceId,
  dateRange,
  onBranchChange,
  onServiceChange,
  onDateRangeChange,
  onRefresh,
  showBranchFilter,
  isLoading
}: DashboardFilterBarProps) {
  const today = new Date();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-border">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range */}
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
          <SelectTrigger className="w-[140px]">
            <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
          </SelectContent>
        </Select>

        {/* Branch Filter */}
        {showBranchFilter && (
          <Select 
            value={selectedBranchId || "all"} 
            onValueChange={(v) => onBranchChange(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[180px]">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Service Filter */}
        <Select 
          value={selectedServiceId || "all"} 
          onValueChange={(v) => onServiceChange(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[280px]">
            <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.length === 0 ? (
              <SelectItem value="none" disabled>No services available</SelectItem>
            ) : (
              services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {formatServiceDisplay(service)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Actions */}
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>

        <Link to="/app/checkin">
          <Button>
            <QrCode className="w-4 h-4 mr-2" />
            Start Check-in
          </Button>
        </Link>
      </div>
    </div>
  );
}
