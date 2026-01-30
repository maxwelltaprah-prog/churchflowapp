import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileImage, FileAudio, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AttachmentUploadProps {
  attachmentType: "sermon_followup" | "daily_content";
  referenceId: string;
  existingAttachments?: Attachment[];
  onUploadComplete: () => void;
  disabled?: boolean;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  expires_at: string;
  is_expired: boolean;
}

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4", "audio/m4a"],
  pdf: ["application/pdf"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

export function AttachmentUpload({
  attachmentType,
  referenceId,
  existingAttachments = [],
  onUploadComplete,
  disabled = false,
}: AttachmentUploadProps) {
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.church_id || !referenceId) return;

    // Validate file type
    const allAllowedTypes = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.audio, ...ALLOWED_TYPES.pdf];
    if (!allAllowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: images, PDFs, and audio files.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique storage path
      const fileExt = file.name.split(".").pop();
      const storagePath = `${profile.church_id}/${attachmentType}/${referenceId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("engagement-content")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Create attachment record
      const { error: dbError } = await supabase
        .from("engagement_attachments")
        .insert({
          church_id: profile.church_id,
          attachment_type: attachmentType,
          reference_id: referenceId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: user?.id,
        });

      if (dbError) {
        // Clean up uploaded file
        await supabase.storage.from("engagement-content").remove([storagePath]);
        throw dbError;
      }

      setUploadProgress(100);
      toast.success("Attachment uploaded successfully");
      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload attachment");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm("Delete this attachment?")) return;

    try {
      // Delete from storage
      await supabase.storage
        .from("engagement-content")
        .remove([attachment.storage_path]);

      // Delete from database
      const { error } = await supabase
        .from("engagement_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;

      toast.success("Attachment deleted");
      onUploadComplete();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Add Attachment
        </Button>
        <span className="text-xs text-muted-foreground">
          Images, PDFs, Audio (max 50MB)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.mp3,.wav,.m4a"
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">Uploading...</p>
        </div>
      )}

      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          {existingAttachments.map((attachment) => {
            const Icon = getFileIcon(attachment.file_type);
            const isExpired = attachment.is_expired || new Date(attachment.expires_at) < new Date();

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{attachment.file_name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(attachment.file_size)}
                </span>
                {isExpired ? (
                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">72h access</Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => handleDelete(attachment)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
