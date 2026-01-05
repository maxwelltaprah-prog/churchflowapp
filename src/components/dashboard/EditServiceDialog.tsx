import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/useChurchData";
import { useUpdateService } from "@/hooks/useChurchMutations";
import { useServiceUploads, useUploadServiceFile, useDeleteServiceUpload } from "@/hooks/useServiceUploads";
import { ServiceUploadFields } from "./ServiceUploadFields";
import { Loader2, FileText, Music, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

const serviceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  service_date: z.string().min(1, "Date is required"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  branch_id: z.string().min(1, "Please select a branch"),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Tables<"services"> | null;
}

export function EditServiceDialog({ open, onOpenChange, service }: EditServiceDialogProps) {
  const { data: branches } = useBranches();
  const updateService = useUpdateService();
  const { data: existingUploads, isLoading: uploadsLoading } = useServiceUploads(service?.id);
  const uploadFile = useUploadServiceFile();
  const deleteUpload = useDeleteServiceUpload();
  
  const [programFile, setProgramFile] = useState<File | null>(null);
  const [sermonFile, setSermonFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      service_date: "",
      start_time: "",
      end_time: "",
      branch_id: "",
    },
  });

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || "",
        service_date: service.service_date,
        start_time: service.start_time || "",
        end_time: service.end_time || "",
        branch_id: service.branch_id,
      });
      // Reset file states when dialog opens with a new service
      setProgramFile(null);
      setSermonFile(null);
    }
  }, [service, form]);

  const existingProgram = existingUploads?.find(u => u.upload_type === "program");
  const existingSermon = existingUploads?.find(u => u.upload_type === "sermon_audio");

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

  const onSubmit = async (data: ServiceFormData) => {
    if (!service) return;
    
    setIsUploading(true);
    try {
      await updateService.mutateAsync({
        id: service.id,
        name: data.name,
        description: data.description || undefined,
        service_date: data.service_date,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        branch_id: data.branch_id,
      });

      // Upload new files if provided
      if (programFile) {
        await uploadFile.mutateAsync({
          serviceId: service.id,
          uploadType: "program",
          file: programFile,
        });
      }

      if (sermonFile) {
        await uploadFile.mutateAsync({
          serviceId: service.id,
          uploadType: "sermon_audio",
          file: sermonFile,
        });
      }

      setProgramFile(null);
      setSermonFile(null);
      onOpenChange(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string, storagePath: string) => {
    if (!service) return;
    await deleteUpload.mutateAsync({ uploadId, storagePath, serviceId: service.id });
  };

  const isPending = updateService.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Update the service details and manage uploads.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sunday Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the service..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Existing Uploads Section */}
            {(existingProgram || existingSermon) && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium text-sm text-foreground">Current Uploads</h4>
                
                {existingProgram && (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Church Program</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(existingProgram.file_size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeRemaining(existingProgram.expires_at) || "Expired"} left
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteUpload(existingProgram.id, existingProgram.storage_path)}
                      disabled={deleteUpload.isPending}
                    >
                      {deleteUpload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                
                {existingSermon && (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                    <Music className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Sermon Audio</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(existingSermon.file_size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeRemaining(existingSermon.expires_at) || "Expired"} left
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteUpload(existingSermon.id, existingSermon.storage_path)}
                      disabled={deleteUpload.isPending}
                    >
                      {deleteUpload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* New Upload Fields */}
            <ServiceUploadFields
              programFile={programFile}
              sermonFile={sermonFile}
              onProgramChange={setProgramFile}
              onSermonChange={setSermonFile}
              disabled={isPending}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
