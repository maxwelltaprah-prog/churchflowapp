import { useState } from "react";
import { Plus, Megaphone, Users, Building2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBroadcasts, useBranches } from "@/hooks/useChurchData";
import { CreateBroadcastDialog } from "@/components/dashboard/CreateBroadcastDialog";
import { formatDistanceToNow } from "date-fns";

const scopeLabels: Record<string, string> = {
  all: "All Members",
  branch: "Specific Branch",
  members: "Members Only",
  visitors: "Visitors Only",
};

const scopeIcons: Record<string, typeof Users> = {
  all: Users,
  branch: Building2,
  members: Users,
  visitors: Users,
};

export default function BroadcastsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: broadcasts, isLoading } = useBroadcasts();
  const { data: branches } = useBranches();

  const filteredBroadcasts = (broadcasts || []).filter((broadcast) => {
    if (branchFilter === "all") return true;
    return broadcast.branch_id === branchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Broadcasts</h1>
          <p className="text-muted-foreground mt-1">
            Send announcements and messages to your congregation
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Broadcast
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-kpi-purple/10 border-kpi-purple/20 hover:bg-kpi-purple/15 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Broadcasts</p>
              <p className="text-3xl font-bold text-foreground">{broadcasts?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>
            <div className="p-3 rounded-xl bg-kpi-purple/20">
              <Megaphone className="w-5 h-5 text-kpi-purple" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-kpi-amber/10 border-kpi-amber/20 hover:bg-kpi-amber/15 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-3xl font-bold text-foreground">
                {broadcasts?.filter((b) => {
                  const date = new Date(b.sent_at);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Messages sent</p>
            </div>
            <div className="p-3 rounded-xl bg-kpi-amber/20">
              <Clock className="w-5 h-5 text-kpi-amber" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-kpi-green/10 border-kpi-green/20 hover:bg-kpi-green/15 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Branches Reached</p>
              <p className="text-3xl font-bold text-foreground">{branches?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Active branches</p>
            </div>
            <div className="p-3 rounded-xl bg-kpi-green/20">
              <Building2 className="w-5 h-5 text-kpi-green" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex justify-end">
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by branch" />
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
      </div>

      {/* Broadcasts List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-4">No broadcasts yet</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Send your first broadcast
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBroadcasts.map((broadcast) => {
            const ScopeIcon = scopeIcons[broadcast.target_scope || "all"] || Users;
            const branchName = (broadcast.branches as any)?.name;
            
            return (
              <Card key={broadcast.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{broadcast.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(broadcast.sent_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {branchName && (
                        <Badge variant="outline">
                          <Building2 className="w-3 h-3 mr-1" />
                          {branchName}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <ScopeIcon className="w-3 h-3 mr-1" />
                        {scopeLabels[broadcast.target_scope || "all"]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{broadcast.message}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateBroadcastDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}