import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ChevronRight, Play, Clock, Sparkles } from "lucide-react";
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
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const hasEnrollments = enrollments && enrollments.length > 0;
  const hasAvailablePlans = availablePlans && availablePlans.length > 0;

  if (!hasEnrollments && !hasAvailablePlans) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No follow-up plans available</p>
          <p className="text-sm text-muted-foreground">Check back after your next service</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Active Enrollments */}
        {hasEnrollments && enrollments.map((enrollment) => (
          <EnrollmentCard
            key={enrollment.id}
            enrollment={enrollment}
            onClick={() => setSelectedEnrollment(enrollment)}
          />
        ))}

        {/* Available Plans */}
        {hasAvailablePlans && (
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Available Plans
              </p>
              <div className="space-y-2">
                {availablePlans.slice(0, 3).map((plan) => (
                  <AvailablePlanItem
                    key={plan.id}
                    plan={plan}
                    onEnroll={() => handleEnroll(plan.id)}
                    isEnrolling={enrollInPlan.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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

interface EnrollmentCardProps {
  enrollment: MemberFollowupEnrollment;
  onClick: () => void;
}

function EnrollmentCard({ enrollment, onClick }: EnrollmentCardProps) {
  const plan = enrollment.plan;
  if (!plan) return null;

  const progressPercent = enrollment.status === "completed" ? 100 : 
                          enrollment.status === "in_progress" ? 50 : 0;

  const statusColors = {
    enrolled: "bg-blue-500/10 text-blue-600",
    in_progress: "bg-amber-500/10 text-amber-600",
    completed: "bg-emerald-500/10 text-emerald-600",
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 shrink-0">
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {plan.duration_days} days
              </Badge>
              <Badge className={`text-xs capitalize ${statusColors[enrollment.status as keyof typeof statusColors] || ''}`}>
                {enrollment.status.replace("_", " ")}
              </Badge>
            </div>
            <h3 className="font-semibold">{plan.title}</h3>
            {plan.service && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on: {plan.service.name}
              </p>
            )}
            <Progress value={progressPercent} className="h-1.5 mt-3" />
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

interface AvailablePlanItemProps {
  plan: SermonFollowupPlan;
  onEnroll: () => void;
  isEnrolling: boolean;
}

function AvailablePlanItem({ plan, onEnroll, isEnrolling }: AvailablePlanItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
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
        onClick={(e) => { e.stopPropagation(); onEnroll(); }}
        disabled={isEnrolling}
        className="shrink-0"
      >
        <Play className="w-3 h-3 mr-1" />
        Start
      </Button>
    </div>
  );
}
