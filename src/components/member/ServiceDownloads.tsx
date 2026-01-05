import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Music, Clock, AlertCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getDownloadUrl, ServiceUpload } from "@/hooks/useServiceUploads";

interface ServiceDownloadsProps {
  uploads: (ServiceUpload & { service?: { name: string; service_date: string; start_time: string | null } | null })[];
  isLoading?: boolean;
  showServiceInfo?: boolean;
}

export function ServiceDownloads({ uploads, isLoading = false, showServiceInfo = true }: ServiceDownloadsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (upload: ServiceUpload) => {
    setDownloading(upload.id);
    try {
      const url = await getDownloadUrl(upload.storage_path);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = upload.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(null);
    }
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Service Downloads
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!uploads || uploads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Service Downloads
          </CardTitle>
          <CardDescription>Download service materials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No downloads available</p>
            <p className="text-sm">No downloads available for this service.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group uploads by service if showing service info
  const groupedUploads = showServiceInfo
    ? uploads.reduce((acc, upload) => {
        const serviceId = upload.service_id;
        if (!acc[serviceId]) {
          acc[serviceId] = {
            service: upload.service,
            uploads: [],
          };
        }
        acc[serviceId].uploads.push(upload);
        return acc;
      }, {} as Record<string, { service: typeof uploads[0]["service"]; uploads: ServiceUpload[] }>)
    : { single: { service: null, uploads } };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Service Downloads
        </CardTitle>
        <CardDescription>Download service materials (available for 48 hours)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedUploads).map(([key, { service, uploads: serviceUploads }]) => (
          <div key={key} className="space-y-3">
            {showServiceInfo && service && (
              <div className="border-b pb-2">
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(service.service_date), "MMM d, yyyy")}
                  {service.start_time && ` • ${service.start_time.slice(0, 5)}`}
                </p>
              </div>
            )}
            
            {serviceUploads.map((upload) => {
              const timeRemaining = getTimeRemaining(upload.expires_at);
              const isExpired = !timeRemaining;

              if (isExpired) {
                return (
                  <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg opacity-60">
                    {upload.upload_type === "program" ? (
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Music className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {upload.upload_type === "program" ? "Church Program" : "Sermon Audio"}
                      </p>
                      <p className="text-xs text-muted-foreground">This file is no longer available.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={upload.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  {upload.upload_type === "program" ? (
                    <FileText className="w-5 h-5 text-primary" />
                  ) : (
                    <Music className="w-5 h-5 text-primary" />
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
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
