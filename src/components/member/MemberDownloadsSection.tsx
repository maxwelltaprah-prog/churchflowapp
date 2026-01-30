import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowUpRight, Clock, Download, FileText, Loader2, Music } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { getDownloadUrl, MemberDownload } from "@/hooks/useServiceUploads";
import { downloadFileFromUrl } from "@/lib/file-download";

interface MemberDownloadsSectionProps {
  downloads: MemberDownload[];
  onBack: () => void;
}

export function MemberDownloadsSection({ downloads, onBack }: MemberDownloadsSectionProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const getTimeRemaining = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    if (expiry <= now) return null;
    return formatDistanceToNow(expiry, { addSuffix: false });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpen = async (upload: MemberDownload) => {
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const url = await getDownloadUrl(upload.storage_path);
      if (!url) {
        win?.close();
        toast.error("This file is no longer available.");
        return;
      }
      if (win) win.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      win?.close();
      console.error("Open error:", error);
      toast.error("Failed to open file");
    }
  };

  const handleDownload = async (upload: MemberDownload) => {
    setDownloading(upload.id);
    setDownloadProgress((prev) => ({ ...prev, [upload.id]: 0 }));
    try {
      const url = await getDownloadUrl(upload.storage_path);
      if (!url) {
        toast.error("This file is no longer available.");
        return;
      }
      await downloadFileFromUrl(url, upload.file_name, (pct) =>
        setDownloadProgress((prev) => ({ ...prev, [upload.id]: pct })),
      );
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  const validDownloads = downloads.filter(d => getTimeRemaining(d.expires_at));

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Service Downloads
          </CardTitle>
          <CardDescription>
            Download materials from services you attended (available for 48 hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {validDownloads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No downloads available</p>
              <p className="text-sm">Check back after attending a service</p>
            </div>
          ) : (
            validDownloads.map((upload) => {
              const timeRemaining = getTimeRemaining(upload.expires_at);
              return (
                <div key={upload.id} className="space-y-2">
                  {upload.service && (
                    <div className="text-sm text-muted-foreground">
                      {upload.service.name} • {format(new Date(upload.service.service_date), "MMM d, yyyy")}
                    </div>
                  )}
                  <div className="rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3 p-3">
                      {upload.upload_type === "program" ? (
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <Music className="w-5 h-5 text-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {upload.upload_type === "program" ? "Church Program" : "Sermon Audio"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(upload.file_size)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeRemaining} left
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpen(upload)}
                          disabled={downloading === upload.id}
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(upload)}
                          disabled={downloading === upload.id}
                        >
                          {downloading === upload.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {downloading === upload.id && (
                      <div className="px-3 pb-3 space-y-2">
                        <Progress value={downloadProgress[upload.id] ?? 0} />
                        <p className="text-[11px] text-muted-foreground text-right">
                          {downloadProgress[upload.id] ?? 0}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
