import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, Circle, BookOpen, Lightbulb, Target } from "lucide-react";
import {
  useFollowupPlanDetails,
  useMemberProgress,
  useCompleteFollowupDay,
  useDayAttachments,
  MemberFollowupEnrollment,
  SermonFollowupDay,
} from "@/hooks/useEngagementData";
import { AttachmentDownload } from "./AttachmentDownload";

interface FollowupPlanDrawerProps {
  enrollment: MemberFollowupEnrollment;
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowupPlanDrawer({
  enrollment,
  memberId,
  open,
  onOpenChange,
}: FollowupPlanDrawerProps) {
  const { data: plan, isLoading: planLoading } = useFollowupPlanDetails(enrollment.plan_id);
  const { data: progress = [], isLoading: progressLoading } = useMemberProgress(enrollment.id);
  const completeDay = useCompleteFollowupDay();

  const completedDayIds = new Set(progress.map((p) => p.day_id));
  const completedCount = completedDayIds.size;
  const totalDays = plan?.days?.length || 0;
  const progressPercent = totalDays > 0 ? (completedCount / totalDays) * 100 : 0;

  const isLoading = planLoading || progressLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{plan?.title || "Loading..."}</SheetTitle>
          <SheetDescription>
            {plan?.description || "Follow along with daily reflections"}
          </SheetDescription>
          {!isLoading && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {completedCount} of {totalDays} days
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          {isLoading ? (
            <div className="space-y-4 pr-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2 pr-4">
              {plan?.days?.map((day) => (
                <DayAccordionItem
                  key={day.id}
                  day={day}
                  isCompleted={completedDayIds.has(day.id)}
                  enrollmentId={enrollment.id}
                  onComplete={completeDay.mutate}
                  isCompletePending={completeDay.isPending}
                />
              ))}
            </Accordion>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface DayAccordionItemProps {
  day: SermonFollowupDay;
  isCompleted: boolean;
  enrollmentId: string;
  onComplete: (params: { enrollmentId: string; dayId: string; reflectionResponse?: string }) => void;
  isCompletePending: boolean;
}

function DayAccordionItem({
  day,
  isCompleted,
  enrollmentId,
  onComplete,
  isCompletePending,
}: DayAccordionItemProps) {
  const [reflection, setReflection] = useState("");
  const { data: attachments = [] } = useDayAttachments(day.id);

  const handleComplete = () => {
    onComplete({
      enrollmentId,
      dayId: day.id,
      reflectionResponse: reflection || undefined,
    });
  };

  return (
    <AccordionItem
      value={day.id}
      className={`border rounded-lg px-4 ${
        isCompleted ? "bg-kpi-green/5 border-kpi-green/30" : "border-border"
      }`}
    >
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 text-left">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-kpi-green shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Day {day.day_number}
              </Badge>
              {isCompleted && (
                <Badge variant="secondary" className="text-xs bg-kpi-green/10 text-kpi-green">
                  Completed
                </Badge>
              )}
            </div>
            <p className="font-medium mt-1">{day.title}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-2 space-y-4">
        {/* Scripture Reference */}
        {day.scripture_reference && (
          <div className="flex items-start gap-2 p-3 bg-kpi-amber/10 rounded-lg">
            <BookOpen className="w-4 h-4 text-kpi-amber mt-0.5" />
            <div>
              <p className="text-xs font-medium text-kpi-amber mb-1">Scripture</p>
              <p className="text-sm">{day.scripture_reference}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{day.content}</p>
        </div>

        {/* Reflection Prompt */}
        {day.reflection_prompt && (
          <div className="flex items-start gap-2 p-3 bg-kpi-purple/10 rounded-lg">
            <Lightbulb className="w-4 h-4 text-kpi-purple mt-0.5" />
            <div>
              <p className="text-xs font-medium text-kpi-purple mb-1">Reflection</p>
              <p className="text-sm">{day.reflection_prompt}</p>
            </div>
          </div>
        )}

        {/* Action Item */}
        {day.action_item && (
          <div className="flex items-start gap-2 p-3 bg-kpi-blue/10 rounded-lg">
            <Target className="w-4 h-4 text-kpi-blue mt-0.5" />
            <div>
              <p className="text-xs font-medium text-kpi-blue mb-1">Action</p>
              <p className="text-sm">{day.action_item}</p>
            </div>
          </div>
        )}

        {/* Downloadable Attachments */}
        {attachments.length > 0 && (
          <AttachmentDownload attachments={attachments} />
        )}
        {!isCompleted && (
          <div className="space-y-3 pt-2">
            {day.reflection_prompt && (
              <Textarea
                placeholder="Share your reflection (optional)..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
              />
            )}
            <Button
              onClick={handleComplete}
              disabled={isCompletePending}
              className="w-full"
            >
              {isCompletePending ? "Saving..." : "Mark as Complete"}
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
