import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Phone, Users, UserPlus, PhoneCall, UserCheck, Search, CalendarDays, Clock, RefreshCw, ClipboardList, Building2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format, formatDistanceToNow, startOfMonth, isWithinInterval, parseISO, getMonth, getYear, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useVisitors, useVisitorStats } from "@/hooks/useVisitorsData";
import { useAllServices, useBranches } from "@/hooks/useChurchData";
import { useBranchAccess } from "@/hooks/useBranchAccess";
import { DateRange } from "react-day-picker";

const howHeardLabels: Record<string, string> = {
  friend_family: "Family",
  social_media: "Social Media",
  walk_in: "Walk-in",
  outreach: "Outreach",
  other: "Other",
};

const statusConfig = {
  new: { label: "New", variant: "default" as const, className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  in_follow_up: { label: "In follow up", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  converted: { label: "Converted", variant: "outline" as const, className: "bg-green-100 text-green-800 hover:bg-green-100" },
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type FilterType = "all" | "service" | "period";

// Format date range for display
function formatDateRangeLabel(range: { startDate: Date; endDate: Date }): string {
  const { startDate, endDate } = range;
  const today = new Date();
  
  if (startDate.toDateString() === today.toDateString() && endDate.toDateString() === today.toDateString()) {
    return "Today";
  }
  
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
}

// Format period range for display
function formatPeriodLabel(startPeriod: string | null, endPeriod: string | null): string {
  if (!startPeriod) return "Select period";
  
  const [startYear, startMonth] = startPeriod.split("-").map(Number);
  const startLabel = `${monthNames[startMonth]} ${startYear}`;
  
  if (!endPeriod || endPeriod === startPeriod) {
    return startLabel;
  }
  
  const [endYear, endMonth] = endPeriod.split("-").map(Number);
  const endLabel = `${monthNames[endMonth]} ${endYear}`;
  
  return `${startLabel} - ${endLabel}`;
}

export default function VisitorsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const today = new Date();
  
  // Branch access and filtering
  const { isChurchAdmin, accessibleBranchIds } = useBranchAccess();
  const { data: allBranches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  
  // Date range picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(today.getFullYear(), 0, 1), // Start of year
    endDate: today
  });
  const [tempDateRange, setTempDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: dateRange.startDate,
    to: dateRange.endDate
  });
  
  // Filter selections
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStartPeriod, setSelectedStartPeriod] = useState<string | null>(null);
  const [selectedEndPeriod, setSelectedEndPeriod] = useState<string | null>(null);
  
  // Popover states
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  // Filter branches based on access
  const availableBranches = useMemo(() => {
    if (!allBranches) return [];
    if (isChurchAdmin) return allBranches;
    if (!accessibleBranchIds) return [];
    return allBranches.filter(b => accessibleBranchIds.includes(b.id));
  }, [allBranches, isChurchAdmin, accessibleBranchIds]);

  const showBranchFilter = isChurchAdmin || (accessibleBranchIds && accessibleBranchIds.length > 1);

  const { data: visitors, isLoading, refetch } = useVisitors(selectedBranchId, statusFilter);
  const { data: stats } = useVisitorStats();
  const { data: allServices } = useAllServices();

  // Sync temp date range when dateRange changes
  useEffect(() => {
    setTempDateRange({ from: dateRange.startDate, to: dateRange.endDate });
  }, [dateRange.startDate, dateRange.endDate]);

  // Use all services for the service filter (sorted by date descending)
  const servicesForFilter = useMemo(() => {
    if (!allServices) return [];
    return [...allServices].sort((a, b) => 
      new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
    );
  }, [allServices]);

  // Extract available periods (month-year combinations) based on date range
  const availablePeriods = useMemo(() => {
    const periodsSet = new Set<string>();

    // Generate month-year combinations within the date range
    let current = new Date(dateRange.startDate);
    while (current <= dateRange.endDate) {
      const year = getYear(current);
      const month = getMonth(current);
      periodsSet.add(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }

    return Array.from(periodsSet).sort().reverse().map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { key, label: `${monthNames[month]} ${year}`, year, month };
    });
  }, [dateRange]);

  // Quick preset buttons
  const applyPreset = (preset: "today" | "this_week" | "this_month" | "this_year") => {
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
        start = startOfMonth(now);
        end = now;
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        start = startOfMonth(now);
        end = now;
        break;
    }
    
    setDateRange({ startDate: start, endDate: end });
    setDatePickerOpen(false);
    // Clear filter selections when date range changes
    setSelectedServiceIds([]);
    setSelectedStartPeriod(null);
    setSelectedEndPeriod(null);
  };

  const handleDateSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setTempDateRange(range);
      if (range.from && range.to) {
        setDateRange({ startDate: range.from, endDate: range.to });
        setDatePickerOpen(false);
        // Clear filter selections when date range changes
        setSelectedServiceIds([]);
        setSelectedStartPeriod(null);
        setSelectedEndPeriod(null);
      }
    }
  };

  // Toggle service selection
  const toggleService = (serviceId: string) => {
    const isSelected = selectedServiceIds.includes(serviceId);
    if (isSelected) {
      setSelectedServiceIds(selectedServiceIds.filter(id => id !== serviceId));
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId]);
    }
  };

  const clearAllServices = () => setSelectedServiceIds([]);
  const selectAllServices = () => setSelectedServiceIds(servicesForFilter.map(s => s.id));

  // Service label for button
  const serviceLabel = useMemo(() => {
    if (selectedServiceIds.length === 0) return "All Services";
    if (selectedServiceIds.length === 1) {
      const service = servicesForFilter.find(s => s.id === selectedServiceIds[0]);
      return service ? service.name : "1 Service";
    }
    return `${selectedServiceIds.length} Services`;
  }, [selectedServiceIds, servicesForFilter]);

  // Handle period selection (start and end)
  const handlePeriodClick = (periodKey: string) => {
    if (!selectedStartPeriod) {
      // First selection - set as start
      setSelectedStartPeriod(periodKey);
      setSelectedEndPeriod(null);
    } else if (!selectedEndPeriod) {
      // Second selection - set as end (ensure proper order)
      const startIdx = availablePeriods.findIndex(p => p.key === selectedStartPeriod);
      const endIdx = availablePeriods.findIndex(p => p.key === periodKey);
      
      if (periodKey === selectedStartPeriod) {
        // Same as start - just use single month
        setSelectedEndPeriod(periodKey);
      } else if (endIdx > startIdx) {
        // Clicked earlier period (since list is reversed) - swap
        setSelectedEndPeriod(selectedStartPeriod);
        setSelectedStartPeriod(periodKey);
      } else {
        setSelectedEndPeriod(periodKey);
      }
    } else {
      // Already have both - start new selection
      setSelectedStartPeriod(periodKey);
      setSelectedEndPeriod(null);
    }
  };

  const clearPeriodSelection = () => {
    setSelectedStartPeriod(null);
    setSelectedEndPeriod(null);
  };

  // Check if a period is within selected range
  const isPeriodInRange = (periodKey: string): boolean => {
    if (!selectedStartPeriod) return false;
    if (!selectedEndPeriod) return periodKey === selectedStartPeriod;
    
    const periods = availablePeriods.map(p => p.key);
    const startIdx = periods.indexOf(selectedStartPeriod);
    const endIdx = periods.indexOf(selectedEndPeriod);
    const currentIdx = periods.indexOf(periodKey);
    
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    return currentIdx >= minIdx && currentIdx <= maxIdx;
  };

  // Apply filters to visitors
  const filteredByPrimaryFilter = useMemo(() => {
    if (!visitors) return [];

    let result = [...visitors];

    switch (filterType) {
      case "service":
        if (selectedServiceIds.length > 0) {
          const serviceDates = servicesForFilter
            .filter(s => selectedServiceIds.includes(s.id))
            .map(s => s.service_date);
          result = result.filter(v => serviceDates.includes(v.first_visit_date));
        }
        break;
      case "period":
        if (selectedStartPeriod) {
          const [startYear, startMonth] = selectedStartPeriod.split("-").map(Number);
          let endYear = startYear;
          let endMonth = startMonth;
          
          if (selectedEndPeriod) {
            [endYear, endMonth] = selectedEndPeriod.split("-").map(Number);
          }
          
          // Ensure proper order (start should be earlier)
          const startDate = new Date(startYear, startMonth, 1);
          const endDate = new Date(endYear, endMonth + 1, 0); // Last day of end month
          
          const actualStart = startDate <= endDate ? startDate : endDate;
          const actualEnd = startDate <= endDate ? endDate : startDate;
          
          result = result.filter((v) => {
            const date = parseISO(v.first_visit_date);
            return date >= actualStart && date <= actualEnd;
          });
        }
        break;
      case "all":
      default:
        break;
    }

    return result;
  }, [visitors, filterType, selectedServiceIds, selectedStartPeriod, selectedEndPeriod, servicesForFilter, availablePeriods]);

  // Apply search filter
  const filteredVisitors = useMemo(() => {
    return filteredByPrimaryFilter.filter((visitor) => {
      const fullName = `${visitor.first_name} ${visitor.last_name}`.toLowerCase();
      const phone = visitor.phone?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || phone.includes(query);
    });
  }, [filteredByPrimaryFilter, searchQuery]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Handle filter type change
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value as FilterType);
    setSelectedServiceIds([]);
    setSelectedStartPeriod(null);
    setSelectedEndPeriod(null);
  };

  // Export visitors to CSV
  const exportToCSV = () => {
    if (!filteredVisitors || filteredVisitors.length === 0) return;

    const headers = ["First Name", "Last Name", "Phone", "Email", "Gender", "Date of Birth", "First Visit Date", "How Heard", "Status", "Branch", "Address"];
    
    const rows = filteredVisitors.map(visitor => [
      visitor.first_name,
      visitor.last_name,
      visitor.phone,
      visitor.email || "",
      visitor.gender || "",
      visitor.date_of_birth || "",
      visitor.first_visit_date,
      howHeardLabels[visitor.how_heard] || visitor.how_heard,
      statusConfig[visitor.status]?.label || visitor.status,
      visitor.branches?.name || "",
      visitor.address || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `visitors_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitor Management</h1>
          <p className="text-muted-foreground">Track and manage church visitors</p>
        </div>
        <Button onClick={() => navigate("/app/visitors/new")} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Register New Visitor
        </Button>
      </div>

      {/* Stats Cards - Always show full totals (unaffected by filters) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-blue-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Visitors</p>
              <p className="text-3xl font-bold">{stats?.total || 0}</p>
            </div>
            <Users className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-orange-500 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">New Visitors</p>
              <p className="text-3xl font-bold">{stats?.new || 0}</p>
            </div>
            <UserPlus className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-purple-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Returning Visitors</p>
              <p className="text-3xl font-bold">{stats?.returning || 0}</p>
            </div>
            <RotateCcw className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-yellow-500 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">In Follow-up</p>
              <p className="text-3xl font-bold">{stats?.inFollowUp || 0}</p>
            </div>
            <PhoneCall className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-green-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Converted</p>
              <p className="text-3xl font-bold">{stats?.converted || 0}</p>
            </div>
            <UserCheck className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar - Dashboard Style */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
        {/* Date Range Picker (controls services/months/years available) */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="truncate">{formatDateRangeLabel(dateRange)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-1 p-2 border-b">
              <Button variant="ghost" size="sm" onClick={() => applyPreset("today")}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset("this_week")}>This Week</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset("this_month")}>This Month</Button>
              <Button variant="ghost" size="sm" onClick={() => applyPreset("this_year")}>This Year</Button>
            </div>
            <CalendarComponent
              mode="range"
              selected={tempDateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              defaultMonth={dateRange.startDate}
              disabled={{ after: today }}
              className="p-3 pointer-events-auto"
            />
            <div className="p-2 border-t text-xs text-muted-foreground text-center">
              Date range controls which services/months/years are shown
            </div>
          </PopoverContent>
        </Popover>

        {/* Branch Filter */}
        {showBranchFilter && (
          <Select 
            value={selectedBranchId || "all"} 
            onValueChange={(v) => setSelectedBranchId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[180px]">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {availableBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filter Type Selector */}
        <Select value={filterType} onValueChange={handleFilterTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visitors</SelectItem>
            <SelectItem value="service">By Service</SelectItem>
            <SelectItem value="period">By Period</SelectItem>
          </SelectContent>
        </Select>

        {/* Service Multi-Select (when filter type is service) */}
        {filterType === "service" && (
          <Popover open={servicePickerOpen} onOpenChange={setServicePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="default" className="w-[220px] justify-start text-left font-normal">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{serviceLabel}</span>
                {selectedServiceIds.length > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-primary-foreground/20">
                    {selectedServiceIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="text-sm font-medium">Select Service(s)</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllServices} disabled={servicesForFilter.length === 0}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllServices} disabled={selectedServiceIds.length === 0}>
                    Clear
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[280px]">
                {servicesForFilter.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No services available</div>
                ) : (
                  <div className="p-2">
                    {servicesForFilter.map((service) => (
                      <div
                        key={service.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedServiceIds.includes(service.id) && "bg-muted"
                        )}
                        onClick={() => toggleService(service.id)}
                      >
                        <Checkbox
                          checked={selectedServiceIds.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{service.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {format(parseISO(service.service_date), "MMM d")}
                            {service.start_time && ` @ ${service.start_time.slice(0, 5)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}

        {/* Period Picker (when filter type is period) */}
        {filterType === "period" && (
          <Popover open={periodPickerOpen} onOpenChange={setPeriodPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="default" className="w-[240px] justify-start text-left font-normal">
                <CalendarDays className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{formatPeriodLabel(selectedStartPeriod, selectedEndPeriod)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="text-sm font-medium">Select Period</span>
                <Button variant="ghost" size="sm" onClick={clearPeriodSelection} disabled={!selectedStartPeriod}>
                  Clear
                </Button>
              </div>
              <div className="p-2 border-b text-xs text-muted-foreground text-center">
                Click once for single month, twice for range
              </div>
              <ScrollArea className="h-[280px]">
                {availablePeriods.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No periods in range</div>
                ) : (
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {availablePeriods.map((period) => (
                      <Button
                        key={period.key}
                        variant={isPeriodInRange(period.key) ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "justify-start",
                          isPeriodInRange(period.key) && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => handlePeriodClick(period.key)}
                      >
                        {period.label}
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}

        {/* Export Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToCSV} 
          disabled={!filteredVisitors || filteredVisitors.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>

        {/* Refresh Button */}
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Visitors Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                Visitors
                {filterType !== "all" && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({filteredVisitors.length} shown)
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {["all", "new", "in_follow_up", "converted"].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? "bg-primary" : ""}
                  >
                    {status === "all" ? "All" : status === "in_follow_up" ? "In Follow-up" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>NAME</TableHead>
                    <TableHead>CONTACT</TableHead>
                    <TableHead>FIRST VISIT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading visitors...
                      </TableCell>
                    </TableRow>
                  ) : filteredVisitors?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No visitors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVisitors?.map((visitor) => (
                      <TableRow key={visitor.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {getInitials(visitor.first_name, visitor.last_name)}
                            </div>
                            <div>
                              <p className="font-medium">{visitor.first_name} {visitor.last_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Heard from: {howHeardLabels[visitor.how_heard]}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{visitor.phone}</p>
                            {visitor.email && (
                              <p className="text-sm text-muted-foreground">{visitor.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{format(new Date(visitor.first_visit_date), "MMM dd, yyyy")}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(visitor.first_visit_date), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[visitor.status].className}>
                            {statusConfig[visitor.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/visitors/${visitor.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/visitors/${visitor.id}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/visitors/${visitor.id}/followup`)}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mb-3 opacity-50" />
              <p>No upcoming follow-ups</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
