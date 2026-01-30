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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useCreateDailyContent,
  useUpdateDailyContent,
  useEngagementAttachments,
} from "@/hooks/useAdminEngagementData";
import { DailyContent } from "@/hooks/useEngagementData";
import { AttachmentUpload, Attachment } from "@/components/engagement/AttachmentUpload";
import { useQueryClient } from "@tanstack/react-query";

interface AddDailyContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContent: DailyContent | null;
}

export function AddDailyContentDialog({
  open,
  onOpenChange,
  editingContent,
}: AddDailyContentDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<DailyContent["content_type"]>("devotional");
  const [publishDate, setPublishDate] = useState<Date>(new Date());
  const [isPublished, setIsPublished] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");

  const createContent = useCreateDailyContent();
  const updateContent = useUpdateDailyContent();
  const queryClient = useQueryClient();

  // Get attachments for the currently editing content
  const { data: contentAttachments } = useEngagementAttachments(
    "daily_content",
    editingContent?.id
  );

  const isEditing = !!editingContent;

  useEffect(() => {
    if (editingContent) {
      setTitle(editingContent.title);
      setContent(editingContent.content);
      setContentType(editingContent.content_type);
      setPublishDate(new Date(editingContent.publish_date));
      setIsPublished(editingContent.is_published);
      setMediaUrl(editingContent.media_url || "");
    } else {
      resetForm();
    }
  }, [editingContent]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setContentType("devotional");
    setPublishDate(new Date());
    setIsPublished(false);
    setMediaUrl("");
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;

    const contentData = {
      title: title.trim(),
      content: content.trim(),
      content_type: contentType,
      publish_date: format(publishDate, "yyyy-MM-dd"),
      is_published: isPublished,
      media_url: mediaUrl.trim() || null,
      branch_id: null,
    };

    if (isEditing && editingContent) {
      updateContent.mutate(
        { id: editingContent.id, ...contentData },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetForm();
          },
        }
      );
    } else {
      createContent.mutate(contentData, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const isPending = createContent.isPending || updateContent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Content" : "Add Daily Content"}</DialogTitle>
          <DialogDescription>
            Create content that members will see in "Today at Church"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devotional">Devotional</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="encouragement">Encouragement</SelectItem>
                  <SelectItem value="scripture">Scripture of the Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Publish Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !publishDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {publishDate ? format(publishDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={publishDate}
                    onSelect={(date) => date && setPublishDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Media URL (optional)</Label>
            <Input
              id="media"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="publish">Publish Immediately</Label>
              <p className="text-xs text-muted-foreground">
                Make visible to members on the publish date
              </p>
            </div>
            <Switch
              id="publish"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>

          {/* Attachments section - only show for saved content */}
          {isEditing && editingContent && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-1">
                <Paperclip className="w-4 h-4" />
                Attachments (72h access)
              </Label>
              <AttachmentUpload
                attachmentType="daily_content"
                referenceId={editingContent.id}
                existingAttachments={(contentAttachments || []) as Attachment[]}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ 
                    queryKey: ["engagement-attachments", "daily_content", editingContent.id] 
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Add images, PDFs, or audio files. Files expire 72 hours after upload.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isPending}
          >
            {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
