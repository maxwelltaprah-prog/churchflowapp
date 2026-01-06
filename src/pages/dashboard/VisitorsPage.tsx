import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Phone, Users, UserPlus, PhoneCall, UserCheck, Search, CheckSquare, CalendarIcon, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow, startOfMonth, endOfMonth, isWithinInterval, parseISO, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { useVisitors, useVisitorStats } from "@/hooks/useVisitorsData";
import { useServices } from "@/hooks/useChurchData";
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

type FilterType = "all" | "service" | "month" | "year";

export default function VisitorsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Primary filter state
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  
  // Date range for limiting month/year options (NOT for filtering visitors)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: visitors, isLoading } = useVisitors(undefined, statusFilter);
  const { data: stats } = useVisitorStats();
  const { data: services } = useServices();

  // Extract available months and years from visitor data
  const { availableMonths, availableYears } = useMemo(() => {
    if (!visitors) return { availableMonths: [], availableYears: [] };

    const monthsSet = new Set<string>();
    const yearsSet = new Set<number>();

    visitors.forEach((visitor) => {
      const date = parseISO(visitor.first_visit_date);
      const year = getYear(date);
      const month = getMonth(date);
      
      // If date range is set, only include months/years within range
      if (dateRange?.from && dateRange?.to) {
        if (isWithinInterval(date, { start: dateRange.from, end: dateRange.to })) {
          monthsSet.add(`${year}-${month}`);
          yearsSet.add(year);
        }
      } else {
        monthsSet.add(`${year}-${month}`);
        yearsSet.add(year);
      }
    });

    // Convert to sorted arrays
    const months = Array.from(monthsSet).sort().reverse().map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { key, label: `${monthNames[month]} ${year}`, year, month };
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return { availableMonths: months, availableYears: years };
  }, [visitors, dateRange]);

  // Apply primary filter to visitors (NOT date range)
  const filteredByPrimaryFilter = useMemo(() => {
    if (!visitors) return [];

    let result = [...visitors];

    // Apply primary filter based on filter type
    switch (filterType) {
      case "service":
        if (selectedServiceId) {
          // Filter visitors by service - using first_visit_date matching service_date
          const service = services?.find((s) => s.id === selectedServiceId);
          if (service) {
            result = result.filter(
              (v) => v.first_visit_date === service.service_date
            );
          }
        }
        break;
      case "month":
        if (selectedMonth) {
          const [year, month] = selectedMonth.split("-").map(Number);
          result = result.filter((v) => {
            const date = parseISO(v.first_visit_date);
            return getYear(date) === year && getMonth(date) === month;
          });
        }
        break;
      case "year":
        if (selectedYear) {
          const year = parseInt(selectedYear);
          result = result.filter((v) => {
            const date = parseISO(v.first_visit_date);
            return getYear(date) === year;
          });
        }
        break;
      case "all":
      default:
        // No filtering
        break;
    }

    return result;
  }, [visitors, filterType, selectedServiceId, selectedMonth, selectedYear, services]);

  // Apply search filter on top of primary filter
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

  // Reset dependent selector when filter type changes
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value as FilterType);
    setSelectedServiceId("");
    setSelectedMonth("");
    setSelectedYear("");
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-sm opacity-90">Converted to Members</p>
              <p className="text-3xl font-bold">{stats?.converted || 0}</p>
            </div>
            <UserCheck className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* Primary Filter Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Filter By</label>
              <Tabs value={filterType} onValueChange={handleFilterTypeChange}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="service">By Service</TabsTrigger>
                  <TabsTrigger value="month">By Month</TabsTrigger>
                  <TabsTrigger value="year">By Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Dependent Selector */}
            {filterType === "service" && (
              <div className="space-y-1.5 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground">Select Service</label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {format(parseISO(service.service_date), "MMM d, yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === "month" && (
              <div className="space-y-1.5 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground">Select Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No months available in selected range
                      </div>
                    ) : (
                      availableMonths.map((month) => (
                        <SelectItem key={month.key} value={month.key}>
                          {month.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === "year" && (
              <div className="space-y-1.5 min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground">Select Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No years available in selected range
                      </div>
                    ) : (
                      availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Range Picker - Only limits month/year options */}
            {(filterType === "month" || filterType === "year") && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Limit Month/Year Options</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, yyyy")} - {format(dateRange.to, "LLL dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, yyyy")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  This only limits the month/year options. It does not change visitor totals.
                </p>
              </div>
            )}

            {/* Clear date range button */}
            {dateRange && (filterType === "month" || filterType === "year") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange(undefined)}
                className="text-muted-foreground"
              >
                Clear range
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
              <CheckSquare className="w-12 h-12 mb-3 opacity-50" />
              <p>No upcoming follow-ups</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
