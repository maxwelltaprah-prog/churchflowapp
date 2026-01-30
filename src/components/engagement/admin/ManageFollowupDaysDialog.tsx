import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import {
  useAdminFollowupPlanDays,
  useUpsertFollowupDay,
  useDeleteFollowupDay,
} from "@/hooks/useAdminEngagementData";
import { SermonFollowupPlan, SermonFollowupDay } from "@/hooks/useEngagementData";

interface ManageFollowupDaysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SermonFollowupPlan | null;
}

interface DayFormData {
  id?: string;
  day_number: number;
  title: string;
  content: string;
  scripture_reference: string;
  reflection_prompt: string;
  action_item: string;
  isNew?: boolean;
  isEditing?: boolean;
}

export function ManageFollowupDaysDialog({
  open,
  onOpenChange,
  plan,
}: ManageFollowupDaysDialogProps) {
  const [editingDay, setEditingDay] = useState<DayFormData | null>(null);

  const { data: days, isLoading } = useAdminFollowupPlanDays(plan?.id);
  const upsertDay = useUpsertFollowupDay();
  const deleteDay = useDeleteFollowupDay();

  if (!plan) return null;

  const handleAddDay = () => {
    const nextDayNumber = (days?.length || 0) + 1;
    setEditingDay({
      day_number: nextDayNumber,
      title: "",
      content: "",
      scripture_reference: "",
      reflection_prompt: "",
      action_item: "",
      isNew: true,
    });
  };

  const handleEditDay = (day: SermonFollowupDay) => {
    setEditingDay({
      id: day.id,
      day_number: day.day_number,
      title: day.title,
      content: day.content,
      scripture_reference: day.scripture_reference || "",
      reflection_prompt: day.reflection_prompt || "",
      action_item: day.action_item || "",
      isEditing: true,
    });
  };

  const handleSaveDay = () => {
    if (!editingDay || !editingDay.title.trim() || !editingDay.content.trim()) return;

    upsertDay.mutate(
      {
        id: editingDay.id,
        plan_id: plan.id,
        day_number: editingDay.day_number,
        title: editingDay.title.trim(),
        content: editingDay.content.trim(),
        scripture_reference: editingDay.scripture_reference.trim() || null,
        reflection_prompt: editingDay.reflection_prompt.trim() || null,
        action_item: editingDay.action_item.trim() || null,
        media_url: null,
      },
      {
        onSuccess: () => setEditingDay(null),
      }
    );
  };

  const handleDeleteDay = (dayId: string) => {
    if (confirm("Are you sure you want to delete this day?")) {
      deleteDay.mutate({ id: dayId, planId: plan.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Days: {plan.title}</DialogTitle>
          <DialogDescription>
            Add and edit daily content for this {plan.duration_days}-day plan
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : editingDay ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Day {editingDay.day_number}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setEditingDay(null)}>
                    Cancel
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Day title..."
                    value={editingDay.title}
                    onChange={(e) =>
                      setEditingDay((prev) => prev && { ...prev, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Main devotional content..."
                    value={editingDay.content}
                    onChange={(e) =>
                      setEditingDay((prev) => prev && { ...prev, content: e.target.value })
                    }
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scripture Reference (optional)</Label>
                  <Input
                    placeholder="e.g., John 3:16-17"
                    value={editingDay.scripture_reference}
                    onChange={(e) =>
                      setEditingDay((prev) =>
                        prev && { ...prev, scripture_reference: e.target.value }
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reflection Prompt (optional)</Label>
                  <Textarea
                    placeholder="A question for members to reflect on..."
                    value={editingDay.reflection_prompt}
                    onChange={(e) =>
                      setEditingDay((prev) =>
                        prev && { ...prev, reflection_prompt: e.target.value }
                      )
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Action Item (optional)</Label>
                  <Input
                    placeholder="A practical step to take..."
                    value={editingDay.action_item}
                    onChange={(e) =>
                      setEditingDay((prev) =>
                        prev && { ...prev, action_item: e.target.value }
                      )
                    }
                  />
                </div>

                <Button
                  onClick={handleSaveDay}
                  disabled={
                    !editingDay.title.trim() ||
                    !editingDay.content.trim() ||
                    upsertDay.isPending
                  }
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {upsertDay.isPending ? "Saving..." : "Save Day"}
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {days?.length || 0} of {plan.duration_days} days created
                </p>
                <Button onClick={handleAddDay} size="sm" disabled={(days?.length || 0) >= plan.duration_days}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Day
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {days?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="font-medium">No days added yet</p>
                      <p className="text-sm">Add daily content to build your plan</p>
                    </div>
                  ) : (
                    days?.map((day) => (
                      <div
                        key={day.id}
                        className="p-4 rounded-lg border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded bg-background">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">Day {day.day_number}</Badge>
                                <span className="font-medium">{day.title}</span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {day.content}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDay(day)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDay(day.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
