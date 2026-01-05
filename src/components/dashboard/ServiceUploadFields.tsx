import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Music, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ServiceUploadFieldsProps {
  programFile: File | null;
  sermonFile: File | null;
  onProgramChange: (file: File | null) => void;
  onSermonChange: (file: File | null) => void;
  disabled?: boolean;
}

export function ServiceUploadFields({
  programFile,
  sermonFile,
  onProgramChange,
  onSermonChange,
  disabled = false,
}: ServiceUploadFieldsProps) {
  const programInputRef = useRef<HTMLInputElement>(null);
  const sermonInputRef = useRef<HTMLInputElement>(null);

  const handleProgramSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PDF, JPEG, PNG");
      return;
    }

    onProgramChange(file);
  };

  const handleSermonSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["audio/mpeg", "audio/mp3"].includes(file.type)) {
      toast.error("Invalid file type. Only MP3 files are allowed");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit");
      return;
    }

    onSermonChange(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium text-sm text-foreground">Uploads (Optional)</h4>
      <p className="text-xs text-muted-foreground">
        Files will be available to members for 48 hours after upload.
      </p>

      {/* Church Program */}
      <div className="space-y-2">
        <Label>Church Program</Label>
        <p className="text-xs text-muted-foreground">PDF, JPEG, or PNG</p>
        
        {programFile ? (
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{programFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(programFile.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onProgramChange(null)}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !disabled && programInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload program</p>
          </div>
        )}
        <Input
          ref={programInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleProgramSelect}
          disabled={disabled}
        />
      </div>

      {/* Sermon Audio */}
      <div className="space-y-2">
        <Label>Sermon Audio</Label>
        <p className="text-xs text-muted-foreground">MP3 only, max 50MB</p>
        
        {sermonFile ? (
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
            <Music className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{sermonFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(sermonFile.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onSermonChange(null)}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !disabled && sermonInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload sermon audio</p>
          </div>
        )}
        <Input
          ref={sermonInputRef}
          type="file"
          accept=".mp3,audio/mpeg"
          className="hidden"
          onChange={handleSermonSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
