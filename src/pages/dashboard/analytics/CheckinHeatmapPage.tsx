import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HeatmapChart } from "@/components/analytics/HeatmapChart";
import { useCheckinHeatmapData, useServiceInstances } from "@/hooks/useCheckinHeatmapData";
import { useBranchAccess } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import { Grid3X3, CalendarDays, Building2, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, isToday, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";

type DatePreset = "today" | "this_week" | "this_month" | "custom";

export default function CheckinHeatmapPage() {
  const { isChurchAdmin, accessibleBranchIds } = useBranchAccess();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  
  // Filters state
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        if (customRange?.from && customRange?.to) {
          return { start: startOfDay(customRange.from), end: endOfDay(customRange.to) };
        }
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [datePreset, customRange]);

  // Filter branches based on access
  const accessibleBranches = useMemo(() => {
    if (!branches) return [];
    if (isChurchAdmin) return branches;
    if (!accessibleBranchIds) return [];
    return branches.filter(b => accessibleBranchIds.includes(b.id));
  }, [branches, isChurchAdmin, accessibleBranchIds]);

  // Fetch services for the service selector
  const effectiveBranchId = branchFilter === "all" ? undefined : branchFilter;
  const { data: services, isLoading: servicesLoading } = useServiceInstances(
    dateRange.start,
    dateRange.end,
    effectiveBranchId
  );

  // Fetch heatmap data
  const effectiveServiceId = serviceFilter === "all" ? undefined : serviceFilter;
  const { data: heatmapData, isLoading: heatmapLoading } = useCheckinHeatmapData(
    dateRange.start,
    dateRange.end,
    effectiveBranchId,
    effectiveServiceId
  );

  // Format service display
  const formatServiceOption = (service: typeof services[0]) => {
    const date = format(parseISO(service.serviceDate), "MMM d");
    const time = service.startTime 
      ? format(parseISO(`2000-01-01T${service.startTime}`), "h:mm a")
      : "";
    return `${service.name} — ${date}${time ? ` @ ${time}` : ""}`;
  };

  // Check if filters are active
  const hasActiveFilters = branchFilter !== "all" || serviceFilter !== "all" || datePreset !== "this_month";

  const clearFilters = () => {
    setBranchFilter("all");
    setServiceFilter("all");
    setDatePreset("this_month");
    setCustomRange(undefined);
  };

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setCustomPopoverOpen(true);
    }
    setDatePreset(value as DatePreset);
  };

  const handleApplyCustomRange = () => {
    if (customRange?.from && customRange?.to) {
      setDatePreset("custom");
      setCustomPopoverOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Grid3X3 className="h-6 w-6 text-primary" />
          Check-in Heatmap
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize check-in patterns by hour across services
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Branch Filter */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Branch
              </label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {isChurchAdmin && <SelectItem value="all">All Branches</SelectItem>}
                  {accessibleBranches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Filter */}
            <div className="flex flex-col gap-1.5 min-w-[280px]">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Service
              </label>
              <Select 
                value={serviceFilter} 
                onValueChange={setServiceFilter}
                disabled={servicesLoading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={servicesLoading ? "Loading..." : "Select service"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services?.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {formatServiceOption(service)}
                    </SelectItem>
                  ))}
                  {services?.length === 0 && (
                    <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                      No services found in this period
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Date Range
              </label>
              <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
                <div className="flex gap-1">
                  <Select value={datePreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={2}
                    defaultMonth={subMonths(new Date(), 1)}
                    disabled={(date) => date > new Date()}
                    className="pointer-events-auto"
                  />
                  <div className="flex justify-end gap-2 p-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setCustomPopoverOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleApplyCustomRange}
                      disabled={!customRange?.from || !customRange?.to}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active filters badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {branchFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {accessibleBranches.find(b => b.id === branchFilter)?.name || "Branch"}
                </Badge>
              )}
              {serviceFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {services?.find(s => s.id === serviceFilter)?.name || "Service"}
                </Badge>
              )}
              {datePreset !== "this_month" && (
                <Badge variant="secondary" className="text-xs">
                  {datePreset === "today" && "Today"}
                  {datePreset === "this_week" && "This Week"}
                  {datePreset === "custom" && customRange?.from && customRange?.to && 
                    `${format(customRange.from, "MMM d")} - ${format(customRange.to, "MMM d")}`
                  }
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {serviceFilter === "all" ? "All Services Heatmap" : "Service Check-in Pattern"}
          </CardTitle>
          <CardDescription>
            {serviceFilter === "all" 
              ? "Check-in volume by hour across all services in the selected period"
              : "Detailed 10-minute interval breakdown for the selected service"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {heatmapLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 48 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <HeatmapChart 
              data={heatmapData || { cells: [], hours: [], rows: [], maxCount: 0, peakHour: null, peakCount: 0, totalCheckins: 0, hasData: false }} 
              isSingleService={serviceFilter !== "all"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
