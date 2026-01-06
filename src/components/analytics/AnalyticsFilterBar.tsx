import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, Filter, Building2, CalendarDays, X, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useBranches } from "@/hooks/useChurchData";
import {
  useAnalyticsFilters,
  useServicesInDateRange,
  DATE_PRESET_OPTIONS,
  formatDateRangeLabel,
  type DateRangePreset,
} from "@/hooks/useAnalyticsFilters";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalyticsFilterBarProps {
  showServiceFilter?: boolean;
  className?: string;
}

export function AnalyticsFilterBar({ 
  showServiceFilter = true,
  className 
}: AnalyticsFilterBarProps) {
  const {
    filters,
    setDatePreset,
    setCustomDateRange,
    setBranchId,
    setServiceIds,
    resetFilters,
    accessibleBranchIds,
    isChurchAdmin,
  } = useAnalyticsFilters();
  
  const { data: allBranches } = useBranches();
  const { data: servicesInRange, isLoading: servicesLoading } = useServicesInDateRange();
  
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.startDate,
    to: filters.endDate,
  });

  // Sync tempDateRange when filters change (e.g., from URL params)
  useEffect(() => {
    setTempDateRange({
      from: filters.startDate,
      to: filters.endDate,
    });
  }, [filters.startDate, filters.endDate]);
  
  // Filter branches based on user access
  const availableBranches = allBranches?.filter(branch => {
    if (isChurchAdmin || accessibleBranchIds === null) return true;
    return accessibleBranchIds.includes(branch.id);
  }) || [];

  // Get valid service IDs that are within the current date range
  const validServiceIds = useMemo(() => {
    if (!servicesInRange) return [];
    const rangeServiceIds = new Set(servicesInRange.map(s => s.id));
    return filters.serviceIds.filter(id => rangeServiceIds.has(id));
  }, [servicesInRange, filters.serviceIds]);

  // Auto-cleanup: remove selected services that fall outside date range
  useEffect(() => {
    if (filters.serviceIds.length > 0 && validServiceIds.length !== filters.serviceIds.length) {
      setServiceIds(validServiceIds);
    }
  }, [validServiceIds, filters.serviceIds, setServiceIds]);
  
  // Check if any filters are active (not default)
  const hasActiveFilters = filters.datePreset !== "this_month" || 
    filters.branchId !== null || 
    filters.serviceIds.length > 0;
  
  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setCustomDateOpen(true);
    } else {
      setDatePreset(preset);
    }
  };
  
  const handleApplyCustomRange = () => {
    if (tempDateRange.from && tempDateRange.to) {
      setCustomDateRange(tempDateRange.from, tempDateRange.to);
      setCustomDateOpen(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    const newServiceIds = filters.serviceIds.includes(serviceId)
      ? filters.serviceIds.filter(id => id !== serviceId)
      : [...filters.serviceIds, serviceId];
    setServiceIds(newServiceIds);
  };

  const handleSelectAllServices = () => {
    if (!servicesInRange) return;
    if (filters.serviceIds.length === servicesInRange.length) {
      // Deselect all
      setServiceIds([]);
    } else {
      // Select all
      setServiceIds(servicesInRange.map(s => s.id));
    }
  };

  const handleClearServices = () => {
    setServiceIds([]);
  };

  // Format service display label
  const formatServiceLabel = (service: { name: string; service_date: string; start_time: string | null; branchName: string }) => {
    const date = format(parseISO(service.service_date), "MMM d");
    const time = service.start_time ? format(parseISO(`2000-01-01T${service.start_time}`), "h:mm a") : "";
    return `${service.name} - ${date}${time ? ` @ ${time}` : ""}`;
  };

  // Get selected services summary for display
  const selectedServicesSummary = useMemo(() => {
    if (filters.serviceIds.length === 0) return "All Services";
    if (filters.serviceIds.length === 1 && servicesInRange) {
      const service = servicesInRange.find(s => s.id === filters.serviceIds[0]);
      return service ? formatServiceLabel(service) : "1 Service";
    }
    return `${filters.serviceIds.length} Services`;
  }, [filters.serviceIds, servicesInRange]);
  
  // Get selected branch name for display
  const selectedBranchName = filters.branchId 
    ? availableBranches.find(b => b.id === filters.branchId)?.name || "Unknown"
    : isChurchAdmin ? "All Branches" : (availableBranches[0]?.name || "No Branch");
  
  return (
    <div className={cn(
      "flex flex-col gap-3 p-4 bg-card border border-border rounded-xl shadow-sm",
      className
    )}>
      {/* Filter label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select 
            value={filters.datePreset} 
            onValueChange={(v) => handlePresetChange(v as DateRangePreset)}
          >
            <SelectTrigger className="w-[160px] h-9 bg-background">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {DATE_PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Custom Date Range Popover */}
          <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 text-xs",
                  filters.datePreset === "custom" && "border-primary"
                )}
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {filters.datePreset === "custom" 
                  ? formatDateRangeLabel(filters)
                  : "Pick dates"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
              <div className="p-3 space-y-3">
                <div className="text-sm font-medium">Select date range</div>
                <CalendarComponent
                  mode="range"
                  selected={{ from: tempDateRange.from, to: tempDateRange.to }}
                  onSelect={(range) => setTempDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                  disabled={(date) => date > new Date()}
                />
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCustomDateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleApplyCustomRange}
                    disabled={!tempDateRange.from || !tempDateRange.to}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-border" />
        
        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground hidden sm:block" />
          {!isChurchAdmin && availableBranches.length === 1 ? (
            // Single branch - show as locked badge
            <Badge variant="secondary" className="h-9 px-3 text-sm font-normal">
              {selectedBranchName}
            </Badge>
          ) : (
            <Select 
              value={filters.branchId || "all"} 
              onValueChange={(v) => setBranchId(v === "all" ? null : v)}
              disabled={!isChurchAdmin && availableBranches.length <= 1}
            >
              <SelectTrigger className="w-[180px] h-9 bg-background">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {isChurchAdmin && (
                  <SelectItem value="all">All Branches</SelectItem>
                )}
                {availableBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Service Multi-Select */}
        {showServiceFilter && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <Popover open={serviceDropdownOpen} onOpenChange={setServiceDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={serviceDropdownOpen}
                  className={cn(
                    "w-[220px] h-9 justify-between bg-background text-sm font-normal",
                    filters.serviceIds.length > 0 && "border-primary"
                  )}
                >
                  <span className="truncate">{selectedServicesSummary}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 bg-popover z-50" align="start">
                <div className="p-2 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Select Services</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSelectAllServices}
                        disabled={!servicesInRange?.length}
                      >
                        {filters.serviceIds.length === servicesInRange?.length ? "Deselect All" : "Select All"}
                      </Button>
                      {filters.serviceIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleClearServices}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <ScrollArea className="max-h-[300px]">
                  {servicesLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading services...
                    </div>
                  ) : !servicesInRange?.length ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No services in selected date range
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {servicesInRange.map((service) => (
                        <div
                          key={service.id}
                          className={cn(
                            "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                            filters.serviceIds.includes(service.id) && "bg-primary/5"
                          )}
                          onClick={() => handleServiceToggle(service.id)}
                        >
                          <Checkbox
                            checked={filters.serviceIds.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                            className="pointer-events-none"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{service.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(parseISO(service.service_date), "MMM d, yyyy")}
                              {service.start_time && ` @ ${format(parseISO(`2000-01-01T${service.start_time}`), "h:mm a")}`}
                              {service.branchName && ` • ${service.branchName}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-2 border-t">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setServiceDropdownOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
      
      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Active:</span>
          {filters.datePreset !== "this_month" && (
            <Badge variant="outline" className="text-xs font-normal">
              {formatDateRangeLabel(filters)}
            </Badge>
          )}
          {filters.branchId && (
            <Badge variant="outline" className="text-xs font-normal">
              {selectedBranchName}
            </Badge>
          )}
          {filters.serviceIds.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              {filters.serviceIds.length === 1 && servicesInRange
                ? servicesInRange.find(s => s.id === filters.serviceIds[0])?.name || "1 Service"
                : `${filters.serviceIds.length} Services`}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}