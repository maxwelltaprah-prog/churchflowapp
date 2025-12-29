import { useState } from "react";
import { Calendar, ChevronDown, Filter, Building2, CalendarDays, X } from "lucide-react";
import { format } from "date-fns";
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
import { cn } from "@/lib/utils";
import { useBranches, useServices } from "@/hooks/useChurchData";
import {
  useAnalyticsFilters,
  DATE_PRESET_OPTIONS,
  formatDateRangeLabel,
  type DateRangePreset,
} from "@/hooks/useAnalyticsFilters";

interface AnalyticsFilterBarProps {
  showServiceFilter?: boolean;
  className?: string;
}

export function AnalyticsFilterBar({ 
  showServiceFilter = false,
  className 
}: AnalyticsFilterBarProps) {
  const {
    filters,
    setDatePreset,
    setCustomDateRange,
    setBranchId,
    setServiceId,
    resetFilters,
    accessibleBranchIds,
    isChurchAdmin,
  } = useAnalyticsFilters();
  
  const { data: allBranches } = useBranches();
  const { data: services } = useServices(filters.branchId || undefined);
  
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.startDate,
    to: filters.endDate,
  });
  
  // Filter branches based on user access
  const availableBranches = allBranches?.filter(branch => {
    if (isChurchAdmin || accessibleBranchIds === null) return true;
    return accessibleBranchIds.includes(branch.id);
  }) || [];
  
  // Check if any filters are active (not default)
  const hasActiveFilters = filters.datePreset !== "this_month" || 
    filters.branchId !== null || 
    filters.serviceId !== null;
  
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
        
        {/* Service Selector (optional) */}
        {showServiceFilter && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <Select 
              value={filters.serviceId || "all"} 
              onValueChange={(v) => setServiceId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[200px] h-9 bg-background">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Services</SelectItem>
                {services?.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({format(new Date(service.service_date), "MMM d")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {filters.serviceId && (
            <Badge variant="outline" className="text-xs font-normal">
              {services?.find(s => s.id === filters.serviceId)?.name || "Service"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
