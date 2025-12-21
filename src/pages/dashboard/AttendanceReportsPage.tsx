import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { 
  FileText, 
  Calendar, 
  Users, 
  Download, 
  Filter,
  Loader2,
  TrendingUp,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBranches, useServices } from "@/hooks/useChurchData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type DateRange = "today" | "this_week" | "this_month" | "last_month" | "all";

export default function AttendanceReportsPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");

  const { profile } = useAuth();
  const { data: branches } = useBranches();
  const { data: services } = useServices(selectedBranch === "all" ? undefined : selectedBranch);

  // Fetch attendance reports
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["attendance-reports", profile?.church_id, selectedBranch, selectedService, dateRange],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("attendance")
        .select(`
          id,
          checked_in_at,
          checkin_method,
          is_cross_branch,
          members(id, full_name, member_code, phone),
          services(id, name, service_date, start_time),
          branches:branch_id(id, name)
        `)
        .eq("church_id", profile.church_id)
        .order("checked_in_at", { ascending: false });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      if (selectedService !== "all") {
        query = query.eq("service_id", selectedService);
      }

      // Apply date filters
      const now = new Date();
      if (dateRange === "today") {
        const todayStart = format(now, "yyyy-MM-dd");
        query = query.gte("checked_in_at", `${todayStart}T00:00:00`);
      } else if (dateRange === "this_week") {
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        query = query.gte("checked_in_at", format(weekStart, "yyyy-MM-dd"));
      } else if (dateRange === "this_month") {
        const monthStart = startOfMonth(new Date());
        query = query.gte("checked_in_at", format(monthStart, "yyyy-MM-dd"));
      } else if (dateRange === "last_month") {
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
        const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
        query = query
          .gte("checked_in_at", format(lastMonthStart, "yyyy-MM-dd"))
          .lte("checked_in_at", format(lastMonthEnd, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id,
  });

  // Calculate stats
  const totalCheckins = attendanceData?.length || 0;
  const uniqueMembers = new Set(attendanceData?.map((a: any) => a.members?.id)).size;
  const crossBranchCheckins = attendanceData?.filter((a: any) => a.is_cross_branch).length || 0;

  const handleExportCSV = () => {
    if (!attendanceData?.length) return;

    const csvContent = [
      ["Member Name", "Member Code", "Service", "Branch", "Check-in Time", "Method"].join(","),
      ...attendanceData.map((record: any) => [
        `"${record.members?.full_name || "Unknown"}"`,
        record.members?.member_code || "",
        `"${record.services?.name || "Unknown"}"`,
        `"${record.branches?.name || "Unknown"}"`,
        format(new Date(record.checked_in_at), "yyyy-MM-dd HH:mm"),
        record.checkin_method || "staff_scan"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze attendance data across services
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={!attendanceData?.length}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {format(new Date(service.service_date), "MMM d")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCheckins}</p>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueMembers}</p>
                <p className="text-sm text-muted-foreground">Unique Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-xl">
                <Calendar className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{crossBranchCheckins}</p>
                <p className="text-sm text-muted-foreground">Cross-Branch</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Attendance Records
          </CardTitle>
          <CardDescription>
            {totalCheckins} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : attendanceData?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records found for the selected filters
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData?.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {record.members?.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{record.members?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{record.members?.member_code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.services?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.services?.service_date && format(new Date(record.services.service_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.branches?.name || "Unknown"}
                          {record.is_cross_branch && (
                            <Badge variant="outline" className="text-xs">Cross-branch</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(record.checked_in_at), "MMM d, h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {record.checkin_method === "self_scan" ? "Self" : "Staff"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
