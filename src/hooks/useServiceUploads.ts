import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ServiceUpload {
  id: string;
  church_id: string;
  service_id: string;
  upload_type: "program" | "sermon_audio";
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_at: string;
  expires_at: string;
  is_expired: boolean;
}

// Fetch uploads for a specific service
export function useServiceUploads(serviceId: string | undefined) {
  return useQuery({
    queryKey: ["service-uploads", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      
      const { data, error } = await supabase
        .from("service_uploads")
        .select("*")
        .eq("service_id", serviceId)
        .eq("is_expired", false)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;
      return data as ServiceUpload[];
    },
    enabled: !!serviceId,
  });
}

// Upload a file for a service
export function useUploadServiceFile() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      serviceId,
      uploadType,
      file,
    }: {
      serviceId: string;
      uploadType: "program" | "sermon_audio";
      file: File;
    }) => {
      if (!profile?.church_id) throw new Error("No church context");

      // Validate file size for sermon audio (50MB limit)
      if (uploadType === "sermon_audio" && file.size > 50 * 1024 * 1024) {
        throw new Error("File size exceeds 50MB limit");
      }

      // Validate file types
      const allowedProgram = ["application/pdf", "image/jpeg", "image/png"];
      const allowedAudio = ["audio/mpeg", "audio/mp3"];

      if (uploadType === "program" && !allowedProgram.includes(file.type)) {
        throw new Error("Invalid file type. Allowed: PDF, JPEG, PNG");
      }

      if (uploadType === "sermon_audio" && !allowedAudio.includes(file.type)) {
        throw new Error("Invalid file type. Allowed: MP3");
      }

      // Generate storage path
      const fileExt = file.name.split(".").pop();
      const storagePath = `${profile.church_id}/${serviceId}/${uploadType}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("service-uploads")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Delete existing upload record if any
      await supabase
        .from("service_uploads")
        .delete()
        .eq("service_id", serviceId)
        .eq("upload_type", uploadType);

      // Create upload record
      const { data, error: insertError } = await supabase
        .from("service_uploads")
        .insert({
          church_id: profile.church_id,
          service_id: serviceId,
          upload_type: uploadType,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-uploads", variables.serviceId] });
      toast.success("File uploaded successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Delete a service upload
export function useDeleteServiceUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uploadId, storagePath, serviceId }: { uploadId: string; storagePath: string; serviceId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("service-uploads")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from("service_uploads")
        .delete()
        .eq("id", uploadId);

      if (deleteError) throw deleteError;

      return serviceId;
    },
    onSuccess: (serviceId) => {
      queryClient.invalidateQueries({ queryKey: ["service-uploads", serviceId] });
      toast.success("File deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Get download URL for a file
export async function getDownloadUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("service-uploads")
    .createSignedUrl(storagePath, 3600); // 1 hour validity

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

export interface MemberDownload extends ServiceUpload {
  service?: {
    id: string;
    name: string;
    service_date: string;
    start_time: string | null;
  } | null;
}

// Fetch available downloads for a member
export function useMemberServiceDownloads(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-downloads", memberId],
    queryFn: async (): Promise<MemberDownload[]> => {
      if (!memberId) return [];

      // Get services the member attended
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          service_id,
          services!inner(id, name, service_date, start_time)
        `)
        .eq("member_id", memberId)
        .order("checked_in_at", { ascending: false });

      if (attendanceError) throw attendanceError;

      const serviceIds = attendance?.map(a => a.service_id) || [];
      if (serviceIds.length === 0) return [];

      // Get non-expired uploads for those services
      const { data: uploads, error: uploadsError } = await supabase
        .from("service_uploads")
        .select("*")
        .in("service_id", serviceIds)
        .eq("is_expired", false)
        .gt("expires_at", new Date().toISOString());

      if (uploadsError) throw uploadsError;

      // Merge with service info
      const serviceMap = new Map(attendance?.map(a => [a.service_id, a.services]) || []);
      
      return (uploads || []).map(upload => ({
        ...upload,
        upload_type: upload.upload_type as "program" | "sermon_audio",
        service: serviceMap.get(upload.service_id) as MemberDownload["service"],
      }));
    },
    enabled: !!memberId,
  });
}
