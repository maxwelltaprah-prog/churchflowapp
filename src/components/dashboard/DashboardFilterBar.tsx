import { Building2, CalendarDays, RefreshCw, QrCode, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { format, parseISO, isToday, startOfMonth } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  start_time?: string;
  service_date?: string;
  branchName?: string;
  branches?: { name: string } | null;
}

export interface DashboardDateRange {
  startDate: Date;
  endDate: Date;
}

interface DashboardFilterBarProps {
  branches: Branch[];
  services: Service[];
  selectedBranchId?: string;
  selectedServiceIds: string[];
  dateRange: DashboardDateRange;
  onBranchChange: (branchId: string | undefined) => void;
  onServiceChange: (serviceIds: string[]) => void;
  onDateRangeChange: (range: DashboardDateRange) => void;
  onRefresh: () => void;
  showBranchFilter: boolean;
  isLoading?: boolean;
  isServicesLoading?: boolean;
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
  const branchName = service.branchName || service.branches?.name;
  if (branchName) {
    parts.push(`(${branchName.replace(" Branch", "")})`);
  }
  
  return parts.join(" ");
}

// Format date range for display
function formatDateRangeLabel(range: DashboardDateRange): string {
  const { startDate, endDate } = range;
  const today = new Date();
  const monthStart = startOfMonth(today);
  
  // Check for common presets
  if (startDate.toDateString() === today.toDateString() && endDate.toDateString() === today.toDateString()) {
    return "Today";
  }
  
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
}

export function DashboardFilterBar({
  branches,
  services,
  selectedBranchId,
  selectedServiceIds,
  dateRange,
  onBranchChange,
  onServiceChange,
  onDateRangeChange,
  onRefresh,
  showBranchFilter,
  isLoading,
  isServicesLoading
}: DashboardFilterBarProps) {
  const today = new Date();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: dateRange.startDate,
    to: dateRange.endDate
  });

  // Sync temp date range when dateRange prop changes
  useEffect(() => {
    setTempDateRange({ from: dateRange.startDate, to: dateRange.endDate });
  }, [dateRange.startDate, dateRange.endDate]);

  // Quick preset buttons
  const applyPreset = (preset: "today" | "this_week" | "this_month") => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (preset) {
      case "today":
        start = now;
        end = now;
        break;
      case "this_week":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        end = now;
        break;
      case "this_month":
      default:
        start = startOfMonth(now);
        end = now;
        break;
    }
    
    onDateRangeChange({ startDate: start, endDate: end });
    setDatePickerOpen(false);
  };

  const handleDateSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setTempDateRange(range);
      if (range.from && range.to) {
        onDateRangeChange({ startDate: range.from, endDate: range.to });
        setDatePickerOpen(false);
      }
    }
  };

  // Select a single service
  const selectService = (serviceId: string) => {
    onServiceChange([serviceId]);
    setServicePickerOpen(false);
  };

  const clearService = () => {
    onServiceChange([]);
  };

  // Service label for single select
  const serviceLabel = useMemo(() => {
    if (selectedServiceIds.length === 0) return "All Services";
    const service = services.find(s => s.id === selectedServiceIds[0]);
    return service ? formatServiceDisplay(service) : "1 Service";
  }, [selectedServiceIds, services]);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-border">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Primary: Service Filter (single select) */}
        <Popover open={servicePickerOpen} onOpenChange={setServicePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="default" className="w-[280px] justify-start text-left font-normal">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{serviceLabel}</span>
              {selectedServiceIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-5 w-5 p-0 hover:bg-primary-foreground/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearService();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium">Select a Service</span>
              {selectedServiceIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearService}>
                  Clear
                </Button>
              )}
            </div>
            <ScrollArea className="h-[280px]">
              {isServicesLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No services in this period</div>
              ) : (
                <div className="p-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedServiceIds.includes(service.id) && "bg-primary/10 border border-primary/20"
                      )}
                      onClick={() => selectService(service.id)}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        selectedServiceIds.includes(service.id) 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground/30"
                      )}>
                        {selectedServiceIds.includes(service.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{service.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {service.service_date && format(parseISO(service.service_date), "MMM d")}
                          {service.start_time && ` @ ${service.start_time.slice(0, 5)}`}
                          {(service.branchName || service.branches?.name) && ` • ${(service.branchName || service.branches?.name)?.replace(" Branch", "")}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Secondary: Date Range (controls which services are available) */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
              <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="truncate">{formatDateRangeLabel(dateRange)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-1 p-2 border-b">
              <Button variant="ghost" size="sm" onClick={() => applyPreset("today")}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset("this_week")}>This Week</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset("this_month")}>This Month</Button>
            </div>
            <Calendar
              mode="range"
              selected={tempDateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              defaultMonth={dateRange.startDate}
              disabled={{ after: today }}
            />
            <div className="p-2 border-t text-xs text-muted-foreground text-center">
              Date range controls which services are shown above
            </div>
          </PopoverContent>
        </Popover>

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
