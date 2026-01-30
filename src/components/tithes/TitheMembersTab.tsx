import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemberTitheStatus, useTitheSettings } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { AddTithePaymentDialog } from "./AddTithePaymentDialog";
import { Search, Download, Plus, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function TitheMembersTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [addPaymentForMember, setAddPaymentForMember] = useState<string | null>(null);

  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { data: memberStatus, isLoading } = useMemberTitheStatus({
    branchId: branchFilter === "all" ? undefined : branchFilter,
    periodMonth,
    periodYear,
  });

  const filteredMembers = memberStatus?.filter((member) => {
    // Status filter
    if (statusFilter === "paid" && !member.paidThisMonth) return false;
    if (statusFilter === "not_paid" && member.paidThisMonth) return false;

    // Search filter
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.phone?.includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!filteredMembers?.length) return;

    const headers = ["Member Name", "Phone", "Status", "Amount This Month", "YTD Total", "Months Paid (Last 12)", "Last Payment"];
    const rows = filteredMembers.map((m) => [
      m.full_name,
      m.phone || "",
      m.paidThisMonth ? "Paid" : "Not Paid",
      m.thisMonthAmount,
      m.ytdTotal,
      m.monthsPaidLast12,
      m.lastPaymentDate || "",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tithe-member-status-${MONTHS[periodMonth - 1].label}-${periodYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paidCount = filteredMembers?.filter((m) => m.paidThisMonth).length || 0;
  const notPaidCount = filteredMembers?.filter((m) => !m.paidThisMonth).length || 0;

  return (
    <div className="space-y-6">
      {/* Period Selection and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-4">
          <Select value={periodMonth.toString()} onValueChange={(v) => setPeriodMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodYear.toString()} onValueChange={(v) => setPeriodYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Branches" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="not_paid">Not Paid Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={!filteredMembers?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-kpi-green">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-kpi-green/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-kpi-green" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidCount}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notPaidCount}</p>
                <p className="text-sm text-muted-foreground">Not Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-kpi-purple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-kpi-purple/20 flex items-center justify-center">
                <span className="text-lg font-bold text-kpi-purple">%</span>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredMembers?.length ? ((paidCount / filteredMembers.length) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Payment Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Member Tithe Status - {MONTHS[periodMonth - 1].label} {periodYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredMembers?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No members found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">YTD Total</TableHead>
                  <TableHead className="text-center">Consistency</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.phone || "-"}</TableCell>
                    <TableCell className="text-center">
                      {member.paidThisMonth ? (
                        <Badge variant="default" className="bg-kpi-green">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Paid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {settings?.privacy_mode
                        ? "••••"
                        : member.thisMonthAmount > 0
                        ? formatCurrency(member.thisMonthAmount)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {settings?.privacy_mode ? "••••" : formatCurrency(member.ytdTotal)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{member.monthsPaidLast12}/12 months</Badge>
                    </TableCell>
                    <TableCell>
                      {member.lastPaymentDate
                        ? format(new Date(member.lastPaymentDate), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAddPaymentForMember(member.id)}
                          title="Add Payment"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      {addPaymentForMember && (
        <AddTithePaymentDialog
          open={!!addPaymentForMember}
          onOpenChange={(open) => !open && setAddPaymentForMember(null)}
          preselectedMemberId={addPaymentForMember}
        />
      )}
    </div>
  );
}
