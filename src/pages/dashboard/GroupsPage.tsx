import { useState } from "react";
import { Plus, Search, MoreHorizontal, Users, Building2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useBranches } from "@/hooks/useChurchData";
import { useGroups, useGroupStats, type Group } from "@/hooks/useGroupsData";
import { useToggleGroupActive, useDeleteGroup, useReorderGroups } from "@/hooks/useGroupMutations";
import { AddGroupDialog } from "@/components/dashboard/AddGroupDialog";
import { EditGroupDialog } from "@/components/dashboard/EditGroupDialog";

export default function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);

  const { data: branches } = useBranches();
  const { data: groups, isLoading } = useGroups();
  const { data: groupStats } = useGroupStats();
  const toggleActive = useToggleGroupActive();
  const deleteGroupMutation = useDeleteGroup();
  const reorderGroups = useReorderGroups();

  // Filter groups
  const filteredGroups = groups?.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = branchFilter === "all" || 
      group.branch_id === branchFilter || 
      (branchFilter === "church-wide" && !group.branch_id);
    return matchesSearch && matchesBranch;
  }) || [];

  const handleToggleActive = async (group: Group) => {
    await toggleActive.mutateAsync({ id: group.id, is_active: !group.is_active });
  };

  const handleDelete = async () => {
    if (deleteGroup) {
      await deleteGroupMutation.mutateAsync(deleteGroup.id);
      setDeleteGroup(null);
    }
  };

  const handleMoveUp = async (group: Group, index: number) => {
    if (index === 0 || !groups) return;
    const prevGroup = filteredGroups[index - 1];
    await reorderGroups.mutateAsync([
      { id: group.id, sort_order: prevGroup.sort_order },
      { id: prevGroup.id, sort_order: group.sort_order },
    ]);
  };

  const handleMoveDown = async (group: Group, index: number) => {
    if (!groups || index === filteredGroups.length - 1) return;
    const nextGroup = filteredGroups[index + 1];
    await reorderGroups.mutateAsync([
      { id: group.id, sort_order: nextGroup.sort_order },
      { id: nextGroup.id, sort_order: group.sort_order },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Groups & Ministries</h1>
          <p className="text-muted-foreground">
            Manage ministry groups and departments
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Groups</p>
              <p className="text-3xl font-bold text-foreground">{groups?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{groups?.filter(g => g.is_active).length || 0} active</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Church-wide</p>
              <p className="text-3xl font-bold text-foreground">{groups?.filter(g => !g.branch_id).length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Cross-branch groups</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-500/5 to-transparent hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Branch-specific</p>
              <p className="text-3xl font-bold text-foreground">{groups?.filter(g => g.branch_id).length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Local groups</p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Building2 className="w-5 h-5 text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="church-wide">Church-wide Only</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Groups</CardTitle>
          <CardDescription>
            {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No groups found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || branchFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first group to get started"}
              </p>
              {!searchQuery && branchFilter === "all" && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Group
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group, index) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(group, index)}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {group.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.branch_id ? (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {group.branches?.name || "Unknown"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Church-wide</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {groupStats?.[group.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={group.is_active}
                        onCheckedChange={() => handleToggleActive(group)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => setEditGroup(group)}>
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMoveUp(group, index)}
                            disabled={index === 0}
                          >
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMoveDown(group, index)}
                            disabled={index === filteredGroups.length - 1}
                          >
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteGroup(group)}
                            className="text-destructive"
                          >
                            Delete Group
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
      <AddGroupDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditGroupDialog
        open={!!editGroup}
        onOpenChange={(open) => !open && setEditGroup(null)}
        group={editGroup}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGroup} onOpenChange={(open) => !open && setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteGroup?.name}"? This will also remove all member associations with this group. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
