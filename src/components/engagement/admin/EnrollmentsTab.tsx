import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2, Clock, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { useAdminEnrollments, useAdminFollowupPlans } from "@/hooks/useAdminEngagementData";

const statusConfig = {
  enrolled: { label: "Enrolled", color: "bg-blue-500/15 text-blue-600", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-500/15 text-amber-600", icon: BookOpen },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
};

export function EnrollmentsTab() {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("all");
  
  const { data: plans, isLoading: plansLoading } = useAdminFollowupPlans();
  const { data: enrollments, isLoading: enrollmentsLoading } = useAdminEnrollments(
    selectedPlanId === "all" ? undefined : selectedPlanId
  );

  const isLoading = plansLoading || enrollmentsLoading;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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

  const completedCount = enrollments?.filter(e => e.status === "completed").length || 0;
  const inProgressCount = enrollments?.filter(e => e.status === "in_progress").length || 0;
  const totalCount = enrollments?.length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BookOpen className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Member Enrollments</CardTitle>
              <CardDescription>
                Track members enrolled in sermon follow-up plans
              </CardDescription>
            </div>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!enrollments || enrollments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No enrollments yet</p>
              <p className="text-sm">Members who enroll in follow-up plans will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => {
                  const config = statusConfig[enrollment.status as keyof typeof statusConfig] || statusConfig.enrolled;
                  const StatusIcon = config.icon;
                  const progress = enrollment.plan_duration > 0 
                    ? Math.round((enrollment.completed_days / enrollment.plan_duration) * 100)
                    : 0;

                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(enrollment.member_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{enrollment.member_name}</div>
                            {enrollment.member_phone && (
                              <div className="text-sm text-muted-foreground">{enrollment.member_phone}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{enrollment.plan_title}</div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.plan_duration} days
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(enrollment.enrolled_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{enrollment.completed_days}/{enrollment.plan_duration} days</span>
                            <span className="text-muted-foreground">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={config.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
