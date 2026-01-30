import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2, Clock, BookOpen, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useAdminEnrollments, useAdminFollowupPlans } from "@/hooks/useAdminEngagementData";

const statusConfig = {
  enrolled: { label: "Enrolled", color: "bg-blue-500/15 text-blue-600", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-500/15 text-amber-600", icon: BookOpen },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
};

export function EnrollmentsTab() {
  const { data: plans, isLoading: plansLoading } = useAdminFollowupPlans();
  const { data: enrollments, isLoading: enrollmentsLoading } = useAdminEnrollments();

  const isLoading = plansLoading || enrollmentsLoading;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Group enrollments by plan
  const enrollmentsByPlan = enrollments?.reduce((acc, enrollment) => {
    if (!acc[enrollment.plan_id]) {
      acc[enrollment.plan_id] = [];
    }
    acc[enrollment.plan_id].push(enrollment);
    return acc;
  }, {} as Record<string, typeof enrollments>) || {};

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

  // Use all plans, not just those with enrollments
  const allPlans = plans || [];

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
          <CardTitle>Enrollments by Sermon</CardTitle>
          <CardDescription>
            Track member progress organized by each sermon follow-up plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No follow-up plans created</p>
              <p className="text-sm">Create a follow-up plan first to track enrollments</p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={allPlans.map(p => p.id)} className="space-y-4">
              {allPlans.map((plan) => {
                const planEnrollments = enrollmentsByPlan[plan.id] || [];
                const planCompleted = planEnrollments.filter(e => e.status === "completed").length;
                const planInProgress = planEnrollments.filter(e => e.status === "in_progress").length;

                return (
                  <AccordionItem
                    key={plan.id}
                    value={plan.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold">{plan.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {plan.duration_days} day plan
                              {plan.service?.name && ` • ${plan.service.name}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-muted">
                            {planEnrollments.length} enrolled
                          </Badge>
                          {planInProgress > 0 && (
                            <Badge variant="secondary" className="bg-amber-500/15 text-amber-600">
                              {planInProgress} in progress
                            </Badge>
                          )}
                          {planCompleted > 0 && (
                            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">
                              {planCompleted} completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      {planEnrollments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No members enrolled in this plan yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {planEnrollments.map((enrollment) => {
                            const config = statusConfig[enrollment.status as keyof typeof statusConfig] || statusConfig.enrolled;
                            const StatusIcon = config.icon;
                            const progress = enrollment.plan_duration > 0
                              ? Math.round((enrollment.completed_days / enrollment.plan_duration) * 100)
                              : 0;

                            return (
                              <div
                                key={enrollment.id}
                                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                              >
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(enrollment.member_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-medium truncate">{enrollment.member_name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Enrolled {format(new Date(enrollment.enrolled_at), "MMM d, yyyy")}
                                        {enrollment.member_phone && ` • ${enrollment.member_phone}`}
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className={config.color}>
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span>{enrollment.completed_days}/{enrollment.plan_duration} days completed</span>
                                      <span className="text-muted-foreground">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-1.5" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
