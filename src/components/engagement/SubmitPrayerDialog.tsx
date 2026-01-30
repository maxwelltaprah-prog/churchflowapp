import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSubmitPrayerRequest } from "@/hooks/useEngagementData";

interface SubmitPrayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  churchId: string;
  branchId: string | null;
}

export function SubmitPrayerDialog({
  open,
  onOpenChange,
  memberId,
  churchId,
  branchId,
}: SubmitPrayerDialogProps) {
  const [requestText, setRequestText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const submitPrayer = useSubmitPrayerRequest();

  const handleSubmit = () => {
    if (!requestText.trim()) return;

    submitPrayer.mutate(
      {
        churchId,
        branchId,
        memberId,
        requestText: requestText.trim(),
        isAnonymous,
        isPublic,
      },
      {
        onSuccess: () => {
          setRequestText("");
          setIsAnonymous(false);
          setIsPublic(true);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit Prayer Request</DialogTitle>
          <DialogDescription>
            Share your prayer need with the church community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="request">Prayer Request</Label>
            <Textarea
              id="request"
              placeholder="Share what you'd like prayer for..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {requestText.length}/500
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anonymous">Post Anonymously</Label>
              <p className="text-xs text-muted-foreground">
                Your name won't be shown
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Share Publicly</Label>
              <p className="text-xs text-muted-foreground">
                Visible to all members
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {!isPublic && (
            <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
              Private requests are only visible to church leadership and will be
              prayed for confidentially.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!requestText.trim() || submitPrayer.isPending}
          >
            {submitPrayer.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
