import { useState } from "react";
import { Plus, MoreHorizontal, Edit, UserMinus, Shield, ShieldCheck, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAdminsByUser } from "@/hooks/useAdminsData";
import { useRemoveAdmin } from "@/hooks/useAdminMutations";
import { useAuth } from "@/contexts/AuthContext";
import { AddAdminDialog } from "@/components/dashboard/AddAdminDialog";
import { EditAdminDialog } from "@/components/dashboard/EditAdminDialog";

type AdminUser = {
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  role: "church_admin" | "branch_admin" | "usher";
  church_id: string;
  branches: { id: string; name: string }[];
  created_at: string;
  roleIds: string[];
};

export default function AdminsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  
  const { data: admins, isLoading } = useAdminsByUser();
  const removeAdmin = useRemoveAdmin();
  const { user, isChurchAdmin } = useAuth();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "church_admin":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Church Admin
          </Badge>
        );
      case "branch_admin":
        return (
          <Badge variant="secondary">
            <Shield className="w-3 h-3 mr-1" />
            Branch Admin
          </Badge>
        );
      case "usher":
        return (
          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            Usher / Staff
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getBranchScope = (admin: AdminUser) => {
    if (admin.role === "church_admin") {
      return <span className="text-muted-foreground">All branches</span>;
    }
    if (admin.branches.length === 0) {
      return <span className="text-muted-foreground">No branches assigned</span>;
    }
    if (admin.branches.length === 1) {
      return <span>{admin.branches[0].name}</span>;
    }
    return (
      <span>
        {admin.branches[0].name}
        <span className="text-muted-foreground ml-1">
          +{admin.branches.length - 1} more
        </span>
      </span>
    );
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleRemove = async () => {
    if (selectedAdmin) {
      await removeAdmin.mutateAsync(selectedAdmin.user_id);
      setShowRemoveDialog(false);
      setSelectedAdmin(null);
    }
  };

  // Only church admins can access this page
  if (!isChurchAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only Church Administrators can manage administrator access and permissions.
          </p>
        </Card>
      </div>
    );
  }

  const churchAdmins = admins?.filter(a => a.role === "church_admin") || [];
  const branchAdmins = admins?.filter(a => a.role === "branch_admin") || [];
  const ushers = admins?.filter(a => a.role === "usher") || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administrators & Access</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrator accounts and their permissions
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Administrator
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Church Admins</p>
              <p className="text-3xl font-bold text-foreground">{churchAdmins.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Full access to all branches</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-500/5 to-transparent hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Branch Admins</p>
              <p className="text-3xl font-bold text-foreground">{branchAdmins.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Limited to assigned branches</p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Shield className="w-5 h-5 text-violet-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-500/5 to-transparent hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ushers & Staff</p>
              <p className="text-3xl font-bold text-foreground">{ushers.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Check-in access only</p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Administrators Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Administrators</CardTitle>
          <CardDescription>
            View and manage all users with administrative access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !admins || admins.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No administrators found</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first administrator
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                            {getInitials(admin.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {admin.profile?.full_name || "Unknown"}
                            {admin.user_id === user?.id && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {admin.profile?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(admin.role)}</TableCell>
                    <TableCell>{getBranchScope(admin)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Role & Access
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive cursor-pointer"
                            disabled={admin.user_id === user?.id}
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowRemoveDialog(true);
                            }}
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddAdminDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditAdminDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        admin={selectedAdmin}
      />

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Administrator Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove administrator access for{" "}
              <strong>{selectedAdmin?.profile?.full_name || selectedAdmin?.profile?.email}</strong>?
              They will no longer be able to access the admin portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
