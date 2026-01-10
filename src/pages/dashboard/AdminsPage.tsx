import { useState } from "react";
import { Plus, MoreHorizontal, Edit, UserMinus, Shield, ShieldCheck, Users, Loader2, RotateCcw, Trash2, Ban, KeyRound } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmins, type AdminUser } from "@/hooks/useAdminsData";
import { useRevokeAdminAccess, useRestoreAdminAccess, useRemoveAdmin } from "@/hooks/useAdminMutations";
import { useAuth } from "@/contexts/AuthContext";
import { AddAdminDialog } from "@/components/dashboard/AddAdminDialog";
import { EditAdminDialog } from "@/components/dashboard/EditAdminDialog";
import { ResetAdminPasswordDialog } from "@/components/dashboard/ResetAdminPasswordDialog";

export default function AdminsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: admins, isLoading } = useAdmins(showInactive);
  const revokeAccess = useRevokeAdminAccess();
  const restoreAccess = useRestoreAdminAccess();
  const removeAdmin = useRemoveAdmin();
  const { user, isChurchAdmin } = useAuth();

  const getRoleBadge = (role: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          <Ban className="w-3 h-3 mr-1" />
          Revoked
        </Badge>
      );
    }
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
    if (!admin.branchPermissions || admin.branchPermissions.length === 0) {
      return <span className="text-muted-foreground">No branches assigned</span>;
    }
    if (admin.branchPermissions.length === 1) {
      return <span>{admin.branchPermissions[0].name}</span>;
    }
    return (
      <span>
        {admin.branchPermissions[0].name}
        <span className="text-muted-foreground ml-1">
          +{admin.branchPermissions.length - 1} more
        </span>
      </span>
    );
  };

  const getMenuCount = (admin: AdminUser) => {
    if (admin.role === "church_admin") {
      return <span className="text-muted-foreground">All menus</span>;
    }
    const count = admin.menuPermissions?.length || 0;
    return <span>{count} menu{count !== 1 ? "s" : ""}</span>;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getDisplayName = (admin: AdminUser) => {
    return admin.member?.full_name || admin.profile?.full_name || "Unknown";
  };

  const getDisplayEmail = (admin: AdminUser) => {
    return admin.member?.email || admin.profile?.email || "";
  };

  const handleRevoke = async () => {
    if (selectedAdmin) {
      await revokeAccess.mutateAsync(selectedAdmin.id);
      setShowRevokeDialog(false);
      setSelectedAdmin(null);
    }
  };

  const handleRestore = async (admin: AdminUser) => {
    await restoreAccess.mutateAsync(admin.id);
  };

  const handleRemove = async () => {
    if (selectedAdmin) {
      await removeAdmin.mutateAsync(selectedAdmin.id);
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

  const activeAdmins = admins?.filter((a) => a.is_active) || [];
  const inactiveAdmins = admins?.filter((a) => !a.is_active) || [];

  const renderAdminRow = (admin: AdminUser) => (
    <TableRow key={admin.id} className={!admin.is_active ? "opacity-60" : ""}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={admin.member?.photo_url || undefined} />
            <AvatarFallback className="bg-accent text-accent-foreground text-sm">
              {getInitials(getDisplayName(admin))}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {getDisplayName(admin)}
              {admin.user_id === user?.id && (
                <span className="ml-2 text-xs text-muted-foreground">(You)</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{getDisplayEmail(admin)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{getRoleBadge(admin.role, admin.is_active)}</TableCell>
      <TableCell className="hidden md:table-cell">{getBranchScope(admin)}</TableCell>
      <TableCell className="hidden lg:table-cell">{getMenuCount(admin)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {admin.is_active ? (
              <>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedAdmin(admin);
                    setShowEditDialog(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Permissions
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={admin.user_id === user?.id}
                  onClick={() => {
                    setSelectedAdmin(admin);
                    setShowResetPasswordDialog(true);
                  }}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-amber-600 cursor-pointer"
                  disabled={admin.user_id === user?.id}
                  onClick={() => {
                    setSelectedAdmin(admin);
                    setShowRevokeDialog(true);
                  }}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Revoke Access
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleRestore(admin)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Access
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => {
                    setSelectedAdmin(admin);
                    setShowRemoveDialog(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Permanently
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administrators & Access</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrator accounts, permissions, and branch access
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Administrator
        </Button>
      </div>

      {/* Administrators Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Administrators</CardTitle>
              <CardDescription>
                View and manage all users with administrative access
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" onValueChange={(v) => setShowInactive(v === "all")}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({activeAdmins.length})</TabsTrigger>
              <TabsTrigger value="all">
                All {inactiveAdmins.length > 0 && `(incl. ${inactiveAdmins.length} revoked)`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : activeAdmins.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active administrators</p>
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
                      <TableHead className="hidden md:table-cell">Branch Access</TableHead>
                      <TableHead className="hidden lg:table-cell">Menu Access</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{activeAdmins.map(renderAdminRow)}</TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !admins || admins.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No administrators found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Administrator</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Branch Access</TableHead>
                      <TableHead className="hidden lg:table-cell">Menu Access</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{admins.map(renderAdminRow)}</TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddAdminDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditAdminDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        admin={selectedAdmin}
      />
      {selectedAdmin && (
        <ResetAdminPasswordDialog
          open={showResetPasswordDialog}
          onOpenChange={setShowResetPasswordDialog}
          adminName={getDisplayName(selectedAdmin)}
          adminEmail={getDisplayEmail(selectedAdmin)}
          adminUserId={selectedAdmin.user_id}
        />
      )}

      {/* Revoke Access Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Administrator Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke administrator access for{" "}
              <strong>{selectedAdmin ? getDisplayName(selectedAdmin) : ""}</strong>?
              They will no longer be able to log into the admin portal for this church.
              This can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleRevoke}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Permanently Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Administrator Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove{" "}
              <strong>{selectedAdmin ? getDisplayName(selectedAdmin) : ""}</strong> as an
              administrator? This action cannot be undone. The member record will not be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Remove Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
