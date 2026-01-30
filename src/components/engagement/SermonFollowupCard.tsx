import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ChevronRight, Play, CheckCircle, Clock } from "lucide-react";
import {
  useMemberEnrollments,
  useAvailableFollowupPlans,
  useEnrollInPlan,
  MemberFollowupEnrollment,
  SermonFollowupPlan,
} from "@/hooks/useEngagementData";
import { FollowupPlanDrawer } from "./FollowupPlanDrawer";

interface SermonFollowupCardProps {
  memberId: string;
}

export function SermonFollowupCard({ memberId }: SermonFollowupCardProps) {
  const [selectedEnrollment, setSelectedEnrollment] = useState<MemberFollowupEnrollment | null>(null);
  const { data: enrollments, isLoading: enrollmentsLoading } = useMemberEnrollments(memberId);
  const { data: availablePlans, isLoading: plansLoading } = useAvailableFollowupPlans(memberId);
  const enrollInPlan = useEnrollInPlan();

  const handleEnroll = (planId: string) => {
    enrollInPlan.mutate({ planId, memberId });
  };

  const isLoading = enrollmentsLoading || plansLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasEnrollments = enrollments && enrollments.length > 0;
  const hasAvailablePlans = availablePlans && availablePlans.length > 0;

  if (!hasEnrollments && !hasAvailablePlans) {
    return null; // Don't render if no content
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-kpi-blue/10">
              <BookOpen className="w-5 h-5 text-kpi-blue" />
            </div>
            <div>
              <CardTitle className="text-lg">Sermon Follow-ups</CardTitle>
              <CardDescription>
                Deepen your understanding with daily reflections
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Enrollments */}
          {hasEnrollments && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Your Active Plans</h4>
              {enrollments.map((enrollment) => (
                <EnrollmentItem
                  key={enrollment.id}
                  enrollment={enrollment}
                  onClick={() => setSelectedEnrollment(enrollment)}
                />
              ))}
            </div>
          )}

          {/* Available Plans to Join */}
          {hasAvailablePlans && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Available Plans
              </h4>
              <ScrollArea className={hasEnrollments ? "h-[150px]" : "h-[200px]"}>
                <div className="space-y-2 pr-4">
                  {availablePlans.map((plan) => (
                    <AvailablePlanItem
                      key={plan.id}
                      plan={plan}
                      onEnroll={() => handleEnroll(plan.id)}
                      isEnrolling={enrollInPlan.isPending}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEnrollment && (
        <FollowupPlanDrawer
          enrollment={selectedEnrollment}
          memberId={memberId}
          open={!!selectedEnrollment}
          onOpenChange={(open) => !open && setSelectedEnrollment(null)}
        />
      )}
    </>
  );
}

interface EnrollmentItemProps {
  enrollment: MemberFollowupEnrollment;
  onClick: () => void;
}

function EnrollmentItem({ enrollment, onClick }: EnrollmentItemProps) {
  const plan = enrollment.plan;
  if (!plan) return null;

  // Calculate progress (placeholder - will be updated when we track completion)
  const progressPercent = enrollment.status === "completed" ? 100 : 
                          enrollment.status === "in_progress" ? 50 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-lg bg-gradient-to-r from-kpi-blue/5 to-kpi-purple/5 border border-kpi-blue/20 hover:border-kpi-blue/40 transition-all text-left group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-kpi-blue/10 text-kpi-blue border-kpi-blue/30">
            <Clock className="w-3 h-3 mr-1" />
            {plan.duration_days} days
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {enrollment.status.replace("_", " ")}
          </Badge>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <h4 className="font-medium mb-1">{plan.title}</h4>
      {plan.service && (
        <p className="text-xs text-muted-foreground mb-2">
          Based on: {plan.service.name}
        </p>
      )}
      <Progress value={progressPercent} className="h-1.5" />
    </button>
  );
}

interface AvailablePlanItemProps {
  plan: SermonFollowupPlan;
  onEnroll: () => void;
  isEnrolling: boolean;
}

function AvailablePlanItem({ plan, onEnroll, isEnrolling }: AvailablePlanItemProps) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{plan.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {plan.duration_days} days
          </Badge>
          {plan.service && (
            <span className="text-xs text-muted-foreground truncate">
              {plan.service.name}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onEnroll}
        disabled={isEnrolling}
        className="shrink-0"
      >
        <Play className="w-3 h-3 mr-1" />
        Start
      </Button>
    </div>
  );
}
