import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Mail,
  Phone,
  QrCode,
  Download,
  Loader2,
  Edit,
  UserX,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  KeyRound,
  Eye,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useMembers, useBranches, usePendingMembersCount } from "@/hooks/useChurchData";
import { useDeactivateMember, useApproveMember, useRejectMember, useBulkApproveMember, useBulkRejectMember } from "@/hooks/useChurchMutations";
import { AddMemberDialog } from "@/components/dashboard/AddMemberDialog";
import { MemberQRDialog } from "@/components/dashboard/MemberQRDialog";
import { EditMemberDialog } from "@/components/dashboard/EditMemberDialog";
import { ResetPinDialog } from "@/components/dashboard/ResetPinDialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  transferred: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
};

const approvalColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

type MemberType = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  gender?: "male" | "female" | "prefer_not_to_say" | null;
  date_of_birth?: string | null;
  membership_status?: "active" | "inactive" | "transferred" | null;
  approval_status?: "pending" | "approved" | "rejected" | null;
  branch_id: string;
  member_code: string;
  qr_code_token: string;
  branches?: { name: string } | null;
  user_id?: string | null;
  member_type?: "regular" | "occasional" | "worker" | null;
  how_heard?: "friend_family" | "social_media" | "walk_in" | "outreach" | "other" | null;
  residential_area?: string | null;
  marital_status?: "single" | "married" | "divorced" | "widowed" | null;
  occupation?: "student" | "public_sector" | "private_sector" | "self_employed" | "unemployed" | "other" | null;
  admin_notes?: string | null;
  date_joined?: string | null;
};

export default function MembersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalTab, setApprovalTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [qrMember, setQrMember] = useState<MemberType | null>(null);
  const [editMember, setEditMember] = useState<MemberType | null>(null);
  const [deactivateMember, setDeactivateMember] = useState<MemberType | null>(null);
  const [resetPinMember, setResetPinMember] = useState<MemberType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);

  const { data: branches } = useBranches();
  const { data: members, isLoading } = useMembers(
    branchFilter !== "all" ? branchFilter : undefined,
    approvalTab
  );
  const { data: pendingCount } = usePendingMembersCount();
  const deactivateMutation = useDeactivateMember();
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();
  const bulkApproveMutation = useBulkApproveMember();
  const bulkRejectMutation = useBulkRejectMember();

  // Filter to get only pending members (eligible for bulk actions)
  const pendingMembers = useMemo(() => 
    (members || []).filter(m => m.approval_status === "pending"),
    [members]
  );

  const pendingMemberIds = useMemo(() => 
    new Set(pendingMembers.map(m => m.id)),
    [pendingMembers]
  );

  // Selected pending members count
  const selectedPendingCount = useMemo(() => {
    let count = 0;
    selectedIds.forEach(id => {
      if (pendingMemberIds.has(id)) count++;
    });
    return count;
  }, [selectedIds, pendingMemberIds]);

  const filteredMembers = (members || []).filter((member) => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (member.member_code?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || member.membership_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    if (!filteredMembers.length) {
      toast.error("No members to export");
      return;
    }

    const headers = ["Name", "Email", "Phone", "Gender", "Status", "Branch", "Member Code", "Approval"];
    const rows = filteredMembers.map((m) => [
      m.full_name,
      m.email || "",
      m.phone || "",
      m.gender || "",
      statusLabels[m.membership_status || "visitor"],
      (m.branches as any)?.name || "",
      m.member_code,
      m.approval_status || "pending",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `members-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Members exported successfully");
  };

  const handleDeactivate = async () => {
    if (!deactivateMember) return;
    await deactivateMutation.mutateAsync(deactivateMember.id);
    setDeactivateMember(null);
  };

  const handleApprove = async (member: MemberType) => {
    await approveMutation.mutateAsync(member.id);
  };

  const handleReject = async (member: MemberType) => {
    await rejectMutation.mutateAsync(member.id);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all pending members in filtered list
      const newSelected = new Set(selectedIds);
      filteredMembers.forEach(m => {
        if (m.approval_status === "pending") {
          newSelected.add(m.id);
        }
      });
      setSelectedIds(newSelected);
    } else {
      // Deselect all in current filtered list
      const newSelected = new Set(selectedIds);
      filteredMembers.forEach(m => newSelected.delete(m.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectOne = (memberId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(memberId);
    } else {
      newSelected.delete(memberId);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async () => {
    if (!bulkAction) return;
    
    // Filter to only pending members
    const eligibleIds = Array.from(selectedIds).filter(id => pendingMemberIds.has(id));
    const skippedCount = selectedIds.size - eligibleIds.length;
    
    if (eligibleIds.length === 0) {
      toast.error("No pending members selected");
      setBulkAction(null);
      return;
    }
    
    if (bulkAction === "approve") {
      await bulkApproveMutation.mutateAsync(eligibleIds);
    } else {
      await bulkRejectMutation.mutateAsync(eligibleIds);
    }
    
    if (skippedCount > 0) {
      toast.info(`${skippedCount} non-pending member(s) were skipped.`);
    }
    
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  // Check if all pending members in filtered list are selected
  const allPendingSelected = useMemo(() => {
    const pendingInFiltered = filteredMembers.filter(m => m.approval_status === "pending");
    if (pendingInFiltered.length === 0) return false;
    return pendingInFiltered.every(m => selectedIds.has(m.id));
  }, [filteredMembers, selectedIds]);

  const somePendingSelected = useMemo(() => {
    const pendingInFiltered = filteredMembers.filter(m => m.approval_status === "pending");
    return pendingInFiltered.some(m => selectedIds.has(m.id)) && !allPendingSelected;
  }, [filteredMembers, selectedIds, allPendingSelected]);

  // Calculate status counts for summary cards
  const statusCounts = useMemo(() => {
    const all = members || [];
    return {
      total: all.length,
      active: all.filter(m => m.membership_status === "active").length,
      inactive: all.filter(m => m.membership_status === "inactive").length,
      transferred: all.filter(m => m.membership_status === "transferred").length,
    };
  }, [members]);

  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-kpi-blue/10 to-kpi-purple/5 rounded-2xl border border-kpi-blue/20 p-4">
          <p className="text-sm text-muted-foreground">Total Members</p>
          <p className="text-2xl font-bold text-kpi-blue">{statusCounts.total}</p>
        </div>
        <div className="bg-gradient-to-br from-kpi-green/10 to-kpi-teal/5 rounded-2xl border border-kpi-green/20 p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-kpi-green">{statusCounts.active}</p>
        </div>
        <div className="bg-gradient-to-br from-kpi-orange/10 to-kpi-amber/5 rounded-2xl border border-kpi-orange/20 p-4">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold text-kpi-orange">{statusCounts.inactive}</p>
        </div>
        <div className="bg-gradient-to-br from-kpi-purple/10 to-kpi-pink/5 rounded-2xl border border-kpi-purple/20 p-4">
          <p className="text-sm text-muted-foreground">Transferred</p>
          <p className="text-2xl font-bold text-kpi-purple">{statusCounts.transferred}</p>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Members</h1>
            <p className="text-sm text-muted-foreground">
              Manage your church members across all branches
            </p>
          </div>
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="text-sm">
              {selectedPendingCount > 0 ? `${selectedPendingCount} pending selected` : `${selectedIds.size} selected`}
            </Badge>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {selectedPendingCount > 0 && (
            <>
              <Button 
                variant="outline" 
                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                onClick={() => setBulkAction("approve")}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Bulk Approve
              </Button>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setBulkAction("reject")}
                disabled={bulkRejectMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Bulk Reject
              </Button>
            </>
          )}
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => navigate("/app/members/new")} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Approval Tabs */}
      <Tabs value={approvalTab} onValueChange={(v) => setApprovalTab(v as typeof approvalTab)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <UserCheck className="w-4 h-4" />
            All Members
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingCount && pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name, email, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center p-12">
            <p className="text-muted-foreground">
              {approvalTab === "pending" ? "No pending approvals" : "No members found"}
            </p>
            {approvalTab === "all" && (
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first member
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allPendingSelected}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLButtonElement).dataset.state = somePendingSelected ? "indeterminate" : allPendingSelected ? "checked" : "unchecked";
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all pending"
                  />
                </TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Branch</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                {approvalTab === "all" && (
                  <TableHead className="hidden lg:table-cell">Approval</TableHead>
                )}
                <TableHead className="hidden lg:table-cell">Code</TableHead>
                <TableHead className="hidden xl:table-cell">Phone</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      onCheckedChange={(checked) => handleSelectOne(member.id, !!checked)}
                      disabled={member.approval_status !== "pending"}
                      aria-label={`Select ${member.full_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {member.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">{member.email || "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{(member.branches as any)?.name || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className={statusColors[member.membership_status || "visitor"]}>
                      {statusLabels[member.membership_status || "visitor"]}
                    </Badge>
                  </TableCell>
                  {approvalTab === "all" && (
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className={approvalColors[member.approval_status || "pending"]}>
                        {member.approval_status || "pending"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-mono text-sm">{member.member_code}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">{member.phone || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Quick action buttons */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/app/members/${member.id}`)}
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditMember(member as MemberType)}
                        title="Edit Member"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {/* Approve/Reject buttons for pending */}
                      {member.approval_status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => handleApprove(member as MemberType)}
                            disabled={approveMutation.isPending}
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleReject(member as MemberType)}
                            disabled={rejectMutation.isPending}
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* More actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                      {member.approval_status === "approved" && (
                        <DropdownMenuItem onClick={() => setQrMember(member as MemberType)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          View QR Code
                        </DropdownMenuItem>
                      )}
                          {member.approval_status === "approved" && (
                            <DropdownMenuItem onClick={() => setResetPinMember(member as MemberType)}>
                              <KeyRound className="w-4 h-4 mr-2" />
                              Reset PIN
                            </DropdownMenuItem>
                          )}
                          {member.approval_status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(member as MemberType)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(member as MemberType)}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {member.approval_status === "rejected" && (
                            <DropdownMenuItem onClick={() => handleApprove(member as MemberType)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {member.email && (
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${member.email}`}>
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                          )}
                          {member.phone && (
                            <DropdownMenuItem onClick={() => window.location.href = `tel:${member.phone}`}>
                              <Phone className="w-4 h-4 mr-2" />
                              Call
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeactivateMember(member as MemberType)}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {members?.length || 0} members
        </p>
      </div>

      {/* Dialogs */}
      <AddMemberDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <MemberQRDialog open={!!qrMember} onOpenChange={(open) => !open && setQrMember(null)} member={qrMember} />
      <EditMemberDialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)} member={editMember} />
      <ResetPinDialog open={!!resetPinMember} onOpenChange={(open) => !open && setResetPinMember(null)} member={resetPinMember} />
      
      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateMember} onOpenChange={(open) => !open && setDeactivateMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivateMember?.full_name}? 
              They will no longer appear in member lists or be able to check in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation */}
      <AlertDialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk action</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {bulkAction} {selectedPendingCount} member(s). Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkAction}
              className={bulkAction === "approve" 
                ? "bg-green-600 text-white hover:bg-green-700" 
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
              disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
            >
              {(bulkApproveMutation.isPending || bulkRejectMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}