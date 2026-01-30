import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Eye, EyeOff, BookOpen } from "lucide-react";
import { format } from "date-fns";
import {
  useAdminFollowupPlans,
  useDeleteFollowupPlan,
  useUpdateFollowupPlan,
} from "@/hooks/useAdminEngagementData";
import { SermonFollowupPlan } from "@/hooks/useEngagementData";
import { AddFollowupPlanDialog } from "./AddFollowupPlanDialog";
import { ManageFollowupDaysDialog } from "./ManageFollowupDaysDialog";

export function FollowupPlansTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SermonFollowupPlan | null>(null);
  const [managingDaysPlan, setManagingDaysPlan] = useState<SermonFollowupPlan | null>(null);

  const { data: plans, isLoading } = useAdminFollowupPlans();
  const deletePlan = useDeleteFollowupPlan();
  const updatePlan = useUpdateFollowupPlan();

  const handleToggleActive = (plan: SermonFollowupPlan) => {
    updatePlan.mutate({ id: plan.id, is_active: !plan.is_active });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this plan? All enrollments will be lost.")) {
      deletePlan.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sermon Follow-up Plans</CardTitle>
              <CardDescription>
                Create multi-day devotional plans to help members apply sermon teachings
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!plans || plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No followup plans yet</p>
              <p className="text-sm">Create a plan to help members grow after sermons</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.title}</div>
                      {plan.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {plan.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.service ? (
                        <div className="text-sm">
                          <div>{plan.service.name}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(plan.service.service_date), "MMM d, yyyy")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{plan.duration_days} days</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{plan.enrollment_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Active" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setManagingDaysPlan(plan)}>
                            <BookOpen className="w-4 h-4 mr-2" />
                            Manage Days
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingPlan(plan)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(plan)}>
                            {plan.is_active ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(plan.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
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

      <AddFollowupPlanDialog
        open={showAddDialog || !!editingPlan}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingPlan(null);
          }
        }}
        editingPlan={editingPlan}
      />

      <ManageFollowupDaysDialog
        open={!!managingDaysPlan}
        onOpenChange={(open) => !open && setManagingDaysPlan(null)}
        plan={managingDaysPlan}
      />
    </>
  );
}
