import { useState } from "react";
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
  KeyRound
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
import { useMembers, useBranches, usePendingMembersCount } from "@/hooks/useChurchData";
import { useDeactivateMember, useApproveMember, useRejectMember } from "@/hooks/useChurchMutations";
import { AddMemberDialog } from "@/components/dashboard/AddMemberDialog";
import { MemberQRDialog } from "@/components/dashboard/MemberQRDialog";
import { EditMemberDialog } from "@/components/dashboard/EditMemberDialog";
import { ResetPinDialog } from "@/components/dashboard/ResetPinDialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  member: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  visitor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  new_convert: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  member: "Member",
  visitor: "Visitor",
  new_convert: "New Convert",
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
  gender?: "male" | "female" | null;
  membership_status?: "member" | "visitor" | "new_convert" | null;
  approval_status?: "pending" | "approved" | "rejected" | null;
  branch_id: string;
  member_code: string;
  qr_code_token: string;
  branches?: { name: string } | null;
  user_id?: string | null;
};

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalTab, setApprovalTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [qrMember, setQrMember] = useState<MemberType | null>(null);
  const [editMember, setEditMember] = useState<MemberType | null>(null);
  const [deactivateMember, setDeactivateMember] = useState<MemberType | null>(null);
  const [resetPinMember, setResetPinMember] = useState<MemberType | null>(null);

  const { data: branches } = useBranches();
  const { data: members, isLoading } = useMembers(
    branchFilter !== "all" ? branchFilter : undefined,
    approvalTab
  );
  const { data: pendingCount } = usePendingMembersCount();
  const deactivateMutation = useDeactivateMember();
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage your church members across all branches
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
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
            <SelectItem value="member">Members</SelectItem>
            <SelectItem value="visitor">Visitors</SelectItem>
            <SelectItem value="new_convert">New Converts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members Table */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
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
                      {member.approval_status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => handleApprove(member as MemberType)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleReject(member as MemberType)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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
                          <DropdownMenuItem onClick={() => setEditMember(member as MemberType)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Member
                          </DropdownMenuItem>
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
    </div>
  );
}