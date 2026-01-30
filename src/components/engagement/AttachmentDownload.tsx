import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileImage, FileAudio, FileText, Loader2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AttachmentDownloadProps {
  attachments: AttachmentInfo[];
  compact?: boolean;
}

export interface AttachmentInfo {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  expires_at: string;
  is_expired: boolean;
}

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4", "audio/m4a"],
  pdf: ["application/pdf"],
};

function getFileIcon(fileType: string) {
  if (ALLOWED_TYPES.image.includes(fileType)) return FileImage;
  if (ALLOWED_TYPES.audio.includes(fileType)) return FileAudio;
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function AttachmentDownload({ attachments, compact = false }: AttachmentDownloadProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (attachment: AttachmentInfo) => {
    const isExpired = attachment.is_expired || new Date(attachment.expires_at) < new Date();
    if (isExpired) {
      toast.error("This attachment has expired and is no longer available.");
      return;
    }

    setDownloading(attachment.id);

    try {
      const { data, error } = await supabase.functions.invoke("get-engagement-download", {
        body: { attachmentId: attachment.id },
      });

      if (error) throw error;

      if (data?.url) {
        // Open download in new tab
        window.open(data.url, "_blank");
        toast.success("Download started");
      } else {
        throw new Error("No download URL received");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      if (error?.message?.includes("expired")) {
        toast.error("This attachment has expired");
      } else {
        toast.error("Failed to download attachment");
      }
    } finally {
      setDownloading(null);
    }
  };

  if (attachments.length === 0) return null;

  const validAttachments = attachments.filter(
    (a) => !a.is_expired && new Date(a.expires_at) > new Date()
  );

  if (validAttachments.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {validAttachments.map((attachment) => {
          const Icon = getFileIcon(attachment.file_type);
          const isDownloading = downloading === attachment.id;

          return (
            <Button
              key={attachment.id}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => handleDownload(attachment)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
              {attachment.file_name.length > 15
                ? attachment.file_name.slice(0, 12) + "..."
                : attachment.file_name}
              <Download className="w-3 h-3" />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3 pt-3 border-t">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Download className="w-3 h-3" />
        Attachments
      </p>
      {validAttachments.map((attachment) => {
        const Icon = getFileIcon(attachment.file_type);
        const isDownloading = downloading === attachment.id;
        const expiresIn = formatDistanceToNow(new Date(attachment.expires_at), { addSuffix: true });

        return (
          <div
            key={attachment.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
          >
            <div className="p-1.5 rounded bg-background">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(attachment.file_size)}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {expiresIn}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(attachment)}
              disabled={isDownloading}
              className="shrink-0"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
