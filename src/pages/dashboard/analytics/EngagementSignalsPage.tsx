import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronRight,
  UserMinus,
  UserCheck,
  Phone,
  Calendar,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useConsecutiveMissSignals, MissedMember, ReturneeMember } from "@/hooks/useConsecutiveMissSignals";
import { useBranches } from "@/hooks/useChurchData";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

// =================== Export Functions ===================
function exportMissedToCSV(members: MissedMember[]) {
  const headers = ["Name", "Status", "Phone", "Email", "Branch", "Last Check-in", "Services Missed"];
  const rows = members.map(m => [
    m.full_name,
    m.membership_status || "",
    m.phone || "",
    m.email || "",
    m.branch_name || "",
    m.last_checkin_date ? format(parseISO(m.last_checkin_date), "yyyy-MM-dd") : "Never",
    m.consecutive_missed.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `missed_3plus_services_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  toast.success("CSV exported successfully");
}

function exportReturneeToCSV(members: ReturneeMember[]) {
  const headers = ["Name", "Status", "Phone", "Email", "Branch", "Return Date", "Previous Missed Count"];
  const rows = members.map(m => [
    m.full_name,
    m.membership_status || "",
    m.phone || "",
    m.email || "",
    m.branch_name || "",
    format(parseISO(m.return_date), "yyyy-MM-dd"),
    m.previous_missed_count.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `returnees_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  toast.success("CSV exported successfully");
}

// =================== Main Component ===================
export default function EngagementSignalsPage() {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get("branch") || undefined;
  
  const { data: branches } = useBranches();
  const { data, isLoading } = useConsecutiveMissSignals(branchId);

  // Get branch name for display
  const branchName = useMemo(() => {
    if (!branchId) return "All Branches";
    const branch = branches?.find(b => b.id === branchId);
    return branch?.name || "Selected Branch";
  }, [branchId, branches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Engagement Signals</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Engagement Signals
            </h1>
            <p className="text-muted-foreground">
              Track members who missed 3+ consecutive service days and recent returnees • {branchName}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missed 3+ Services</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{data?.missedCount || 0}</p>
                <p className="text-xs text-muted-foreground">consecutive service days</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Returnees</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{data?.returneeCount || 0}</p>
                <p className="text-xs text-muted-foreground">came back this service</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Missed</p>
                <p className="text-3xl font-bold mt-1">
                  {data?.missedMembers?.length 
                    ? Math.round(data.missedMembers.reduce((sum, m) => sum + m.consecutive_missed, 0) / data.missedMembers.length)
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">service occurrences</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Max Missed</p>
                <p className="text-3xl font-bold mt-1 text-amber-600">
                  {data?.missedMembers?.length 
                    ? Math.max(...data.missedMembers.map(m => m.consecutive_missed))
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">service occurrences</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Missed / Returnees */}
      <Tabs defaultValue="missed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="missed" className="gap-2">
            <UserMinus className="w-4 h-4" />
            Missed 3+ Services ({data?.missedCount || 0})
          </TabsTrigger>
          <TabsTrigger value="returnees" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Returnees ({data?.returneeCount || 0})
          </TabsTrigger>
        </TabsList>

        {/* Missed Members Tab */}
        <TabsContent value="missed">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserMinus className="w-5 h-5 text-red-600" />
                    Members Missed 3+ Consecutive Service Days
                  </CardTitle>
                  <CardDescription>
                    These members have not checked in for the last 3 or more service occurrences
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => data?.missedMembers && exportMissedToCSV(data.missedMembers)}
                  disabled={!data?.missedMembers?.length}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !data?.missedMembers?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No members in this category!</p>
                  <p className="text-sm">All members have attended within the last 3 service days</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Last Check-in</TableHead>
                        <TableHead className="text-center">Services Missed</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.missedMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {member.membership_status?.replace("_", " ") || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.phone || "—"}</TableCell>
                          <TableCell>{member.branch_name || "—"}</TableCell>
                          <TableCell>
                            {member.last_checkin_date ? (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{format(parseISO(member.last_checkin_date), "MMM d, yyyy")}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="destructive" 
                              className={member.consecutive_missed >= 5 ? "animate-pulse" : ""}
                            >
                              {member.consecutive_missed}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.phone && (
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <a href={`tel:${member.phone}`}>
                                  <Phone className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returnees Tab */}
        <TabsContent value="returnees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    Returnees — Just Checked In
                  </CardTitle>
                  <CardDescription>
                    Members who were in the "missed 3+" category and have now returned
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => data?.returnees && exportReturneeToCSV(data.returnees)}
                  disabled={!data?.returnees?.length}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !data?.returnees?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No returnees this service day</p>
                  <p className="text-sm">Members returning from 3+ missed services will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Return Date</TableHead>
                        <TableHead className="text-center">Previously Missed</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.returnees.map((member) => (
                        <TableRow key={member.id} className="bg-green-500/5">
                          <TableCell className="font-medium">{member.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {member.membership_status?.replace("_", " ") || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.phone || "—"}</TableCell>
                          <TableCell>{member.branch_name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-green-600">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{format(parseISO(member.return_date), "MMM d, yyyy")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {member.previous_missed_count} services
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.phone && (
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <a href={`tel:${member.phone}`}>
                                  <Phone className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
