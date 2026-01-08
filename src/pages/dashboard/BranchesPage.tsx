import { useState } from "react";
import { Plus, MoreHorizontal, Users, MapPin, Edit, Trash2, Link as LinkIcon, Loader2, QrCode, Phone, Mail, User, Building2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useBranchStats, useDashboardStats } from "@/hooks/useChurchData";
import { useDeactivateBranch } from "@/hooks/useChurchMutations";
import { AddBranchDialog } from "@/components/dashboard/AddBranchDialog";
import { EditBranchDialog } from "@/components/dashboard/EditBranchDialog";
import { BranchQRDialog } from "@/components/dashboard/BranchQRDialog";
import { toast } from "sonner";

type BranchType = {
  id: string;
  name: string;
  location?: string | null;
  join_code: string;
  is_main_branch?: boolean | null;
  is_active?: boolean | null;
  memberCount: number;
  todayAttendance: number;
  overseer_name?: string | null;
  overseer_phone?: string | null;
  overseer_email?: string | null;
};

export default function BranchesPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchType | null>(null);
  const [qrBranch, setQrBranch] = useState<BranchType | null>(null);
  const { data: branches, isLoading } = useBranchStats();
  const { data: stats } = useDashboardStats();
  const deactivateBranch = useDeactivateBranch();

  const copyJoinLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    toast.success("Join link copied to clipboard");
  };

  const totalMembers = branches?.reduce((sum, b) => sum + b.memberCount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Branches</h1>
          <p className="text-muted-foreground mt-1">
            Manage your church locations and sub-branches
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-kpi-blue/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Branches</p>
              <p className="text-3xl font-bold text-kpi-blue">{branches?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{branches?.filter(b => b.is_active).length || 0} active</p>
            </div>
            <div className="p-2.5 rounded-xl bg-kpi-blue text-white">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-kpi-green/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-3xl font-bold text-kpi-green">{totalMembers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Across all branches</p>
            </div>
            <div className="p-2.5 rounded-xl bg-kpi-green text-white">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-kpi-orange/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Check-ins</p>
              <p className="text-3xl font-bold text-kpi-orange">{stats?.todayCheckins || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">All branches combined</p>
            </div>
            <div className="p-2.5 rounded-xl bg-kpi-orange text-white">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : branches?.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No branches found</p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create your first branch
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {branches?.map((branch) => (
            <Card key={branch.id} className="relative overflow-hidden border-0 bg-card">
              {branch.is_main_branch && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-accent text-accent-foreground">
                    Main Branch
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{branch.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {branch.location || "No location set"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => setQrBranch(branch as BranchType)}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        View QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => copyJoinLink(branch.join_code)}
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Copy Join Link
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedBranch(branch as BranchType);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Branch
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive cursor-pointer"
                        onClick={() => {
                          setSelectedBranch(branch as BranchType);
                          setShowDeactivateDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Join Code */}
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Join Code</p>
                      <p className="font-mono font-medium">{branch.join_code}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setQrBranch(branch as BranchType)}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyJoinLink(branch.join_code)}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    </div>

                  {/* Overseer Info */}
                  {(branch.overseer_name || branch.overseer_phone || branch.overseer_email) && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Overseer</p>
                      {branch.overseer_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span>{branch.overseer_name}</span>
                        </div>
                      )}
                      {branch.overseer_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <a href={`tel:${branch.overseer_phone}`} className="hover:underline text-primary">
                            {branch.overseer_phone}
                          </a>
                        </div>
                      )}
                      {branch.overseer_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <a href={`mailto:${branch.overseer_email}`} className="hover:underline text-primary">
                            {branch.overseer_email}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{branch.memberCount}</p>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <p className="text-2xl font-bold text-accent">{branch.todayAttendance}</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${branch.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm text-muted-foreground">
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-1" />
                      View Members
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBranchDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditBranchDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        branch={selectedBranch} 
      />
      <BranchQRDialog open={!!qrBranch} onOpenChange={(open) => !open && setQrBranch(null)} branch={qrBranch} />
      
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{selectedBranch?.name}"? This will hide the branch from active lists but won't delete any data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedBranch) {
                  deactivateBranch.mutate(selectedBranch.id);
                }
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
