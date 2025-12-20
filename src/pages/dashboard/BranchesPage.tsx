import { useState } from "react";
import { Plus, MoreHorizontal, Users, MapPin, Edit, Trash2, Link as LinkIcon, Loader2, QrCode } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useBranchStats, useDashboardStats } from "@/hooks/useChurchData";
import { AddBranchDialog } from "@/components/dashboard/AddBranchDialog";
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
};

export default function BranchesPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [qrBranch, setQrBranch] = useState<BranchType | null>(null);
  const { data: branches, isLoading } = useBranchStats();
  const { data: stats } = useDashboardStats();

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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Branches</CardDescription>
            <CardTitle className="text-3xl">{branches?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {branches?.filter(b => b.is_active).length || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">
              {totalMembers.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Across all branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today's Check-ins</CardDescription>
            <CardTitle className="text-3xl">{stats?.todayCheckins || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">All branches combined</p>
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
            <Card key={branch.id} className="relative overflow-hidden">
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
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setQrBranch(branch as BranchType)}>
                        <QrCode className="w-4 h-4 mr-2" />
                        View QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyJoinLink(branch.join_code)}>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Copy Join Link
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Branch
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
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
      <BranchQRDialog open={!!qrBranch} onOpenChange={(open) => !open && setQrBranch(null)} branch={qrBranch} />
    </div>
  );
}
