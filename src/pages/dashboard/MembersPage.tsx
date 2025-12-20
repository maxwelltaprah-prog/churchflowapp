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
  UserX
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
import { useMembers, useBranches } from "@/hooks/useChurchData";
import { useDeactivateMember } from "@/hooks/useChurchMutations";
import { AddMemberDialog } from "@/components/dashboard/AddMemberDialog";
import { MemberQRDialog } from "@/components/dashboard/MemberQRDialog";
import { EditMemberDialog } from "@/components/dashboard/EditMemberDialog";
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

type MemberType = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  gender?: "male" | "female" | null;
  membership_status?: "member" | "visitor" | "new_convert" | null;
  branch_id: string;
  member_code: string;
  qr_code_token: string;
  branches?: { name: string } | null;
};

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [qrMember, setQrMember] = useState<MemberType | null>(null);
  const [editMember, setEditMember] = useState<MemberType | null>(null);
  const [deactivateMember, setDeactivateMember] = useState<MemberType | null>(null);

  const { data: branches } = useBranches();
  const { data: members, isLoading } = useMembers(branchFilter !== "all" ? branchFilter : undefined);
  const deactivateMutation = useDeactivateMember();

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

    const headers = ["Name", "Email", "Phone", "Gender", "Status", "Branch", "Member Code"];
    const rows = filteredMembers.map((m) => [
      m.full_name,
      m.email || "",
      m.phone || "",
      m.gender || "",
      statusLabels[m.membership_status || "visitor"],
      (m.branches as any)?.name || "",
      m.member_code,
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
            <p className="text-muted-foreground">No members found</p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first member
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Branch</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
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
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-mono text-sm">{member.member_code}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">{member.phone || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setQrMember(member as MemberType)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          View QR Code
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditMember(member as MemberType)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Member
                        </DropdownMenuItem>
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