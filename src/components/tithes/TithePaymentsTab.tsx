import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTithePayments, useTitheSettings, type TithePayment } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { AddTithePaymentDialog } from "./AddTithePaymentDialog";
import { EditTithePaymentDialog } from "./EditTithePaymentDialog";
import { TitheReceiptDialog } from "./TitheReceiptDialog";
import { Plus, Search, Download, Edit, RotateCcw, Receipt, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useTitheMutations } from "@/hooks/useTitheData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function TithePaymentsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<TithePayment | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<TithePayment | null>(null);
  const [reversingPayment, setReversingPayment] = useState<TithePayment | null>(null);

  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { reversePayment } = useTitheMutations();

  const { data: payments, isLoading } = useTithePayments({
    branchId: branchFilter === "all" ? undefined : branchFilter,
    paymentMethod: methodFilter === "all" ? undefined : methodFilter as any,
    status: statusFilter === "all" ? undefined : statusFilter === "active" ? undefined : statusFilter as any,
  });

  const filteredPayments = payments?.filter((payment) => {
    // If "active" is selected, exclude reversed
    if (statusFilter === "active" && payment.status === "reversed") {
      return false;
    }
    // If "reversed" is selected, only show reversed
    if (statusFilter === "reversed" && payment.status !== "reversed") {
      return false;
    }

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.member?.full_name?.toLowerCase().includes(searchLower) ||
      payment.reference_note?.toLowerCase().includes(searchLower) ||
      payment.amount.toString().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!filteredPayments?.length) return;

    const headers = ["Payment Date", "Member Name", "Amount", "Period", "Method", "Reference", "Status"];
    const rows = filteredPayments.map((p) => [
      format(new Date(p.payment_date), "yyyy-MM-dd"),
      p.member?.full_name || "Unknown",
      p.amount,
      `${MONTHS[p.period_month - 1]} ${p.period_year}`,
      p.payment_method,
      p.reference_note || "",
      p.status,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tithe-payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReversePayment = async () => {
    if (!reversingPayment) return;
    await reversePayment.mutateAsync(reversingPayment.id);
    setReversingPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[250px]"
            />
          </div>
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
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="momo">Mobile Money</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reversed">Reversed Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={!filteredPayments?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tithe Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPayments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tithe payments found</p>
              <Button variant="link" onClick={() => setShowAddDialog(true)}>
                Add your first payment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments?.map((payment) => (
                  <TableRow key={payment.id} className={payment.status === "reversed" ? "opacity-60" : ""}>
                    <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{payment.member?.full_name || "Unknown"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {settings?.privacy_mode ? "••••" : formatCurrency(Number(payment.amount))}
                    </TableCell>
                    <TableCell>
                      {MONTHS[payment.period_month - 1]} {payment.period_year}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {payment.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {payment.reference_note || "-"}
                    </TableCell>
                    <TableCell>{payment.recorded_by?.full_name || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={payment.status === "paid" ? "default" : payment.status === "reversed" ? "destructive" : "secondary"}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setReceiptPayment(payment)}
                          title="View Receipt"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        {payment.status !== "reversed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPayment(payment)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setReversingPayment(payment)}
                              title="Reverse"
                              className="text-destructive hover:text-destructive"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddTithePaymentDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      
      {editingPayment && (
        <EditTithePaymentDialog
          payment={editingPayment}
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
        />
      )}

      {receiptPayment && (
        <TitheReceiptDialog
          payment={receiptPayment}
          open={!!receiptPayment}
          onOpenChange={(open) => !open && setReceiptPayment(null)}
        />
      )}

      {/* Reverse Confirmation Dialog */}
      <AlertDialog open={!!reversingPayment} onOpenChange={(open) => !open && setReversingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Reverse Payment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reverse this payment? This action will mark the payment as reversed
              but keep the record for audit purposes. The amount will be excluded from all totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReversePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reverse Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
