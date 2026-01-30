import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateFollowupPlan,
  useUpdateFollowupPlan,
} from "@/hooks/useAdminEngagementData";
import { SermonFollowupPlan } from "@/hooks/useEngagementData";
import { format } from "date-fns";

interface AddFollowupPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlan: SermonFollowupPlan | null;
}

export function AddFollowupPlanDialog({
  open,
  onOpenChange,
  editingPlan,
}: AddFollowupPlanDialogProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [durationDays, setDurationDays] = useState(7);
  const [autoEnroll, setAutoEnroll] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const createPlan = useCreateFollowupPlan();
  const updatePlan = useUpdateFollowupPlan();

  const isEditing = !!editingPlan;

  // Fetch recent services for linking
  const { data: services } = useQuery({
    queryKey: ["recent-services", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("services")
        .select("id, name, service_date")
        .eq("church_id", profile.church_id)
        .order("service_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id && open,
  });

  useEffect(() => {
    if (editingPlan) {
      setTitle(editingPlan.title);
      setDescription(editingPlan.description || "");
      setServiceId(editingPlan.service_id || "");
      setDurationDays(editingPlan.duration_days);
      setAutoEnroll(editingPlan.auto_enroll_attendees);
      setIsActive(editingPlan.is_active);
    } else {
      resetForm();
    }
  }, [editingPlan]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setServiceId("");
    setDurationDays(7);
    setAutoEnroll(false);
    setIsActive(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    if (isEditing && editingPlan) {
      updatePlan.mutate(
        {
          id: editingPlan.id,
          title: title.trim(),
          description: description.trim() || null,
          service_id: serviceId || null,
          duration_days: durationDays,
          auto_enroll_attendees: autoEnroll,
          is_active: isActive,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetForm();
          },
        }
      );
    } else {
      createPlan.mutate(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          service_id: serviceId || undefined,
          duration_days: durationDays,
          auto_enroll_attendees: autoEnroll,
          days: [],
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetForm();
          },
        }
      );
    }
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "Create Followup Plan"}</DialogTitle>
          <DialogDescription>
            Create a multi-day devotional plan for members to deepen their understanding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Plan Title</Label>
            <Input
              id="title"
              placeholder="e.g., Living Out Faith in Daily Life"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of what members will learn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link to Service (optional)</Label>
              <Select value={serviceId || "none"} onValueChange={(v) => setServiceId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({format(new Date(service.service_date), "MMM d")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={30}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="autoEnroll">Auto-enroll Attendees</Label>
              <p className="text-xs text-muted-foreground">
                Automatically enroll members who attended the linked service
              </p>
            </div>
            <Switch
              id="autoEnroll"
              checked={autoEnroll}
              onCheckedChange={setAutoEnroll}
              disabled={!serviceId}
            />
          </div>

          {isEditing && (
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this plan available for members to enroll
                </p>
              </div>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
            {isPending ? "Saving..." : isEditing ? "Update" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
