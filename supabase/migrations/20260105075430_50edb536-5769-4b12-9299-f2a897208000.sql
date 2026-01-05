-- Create storage bucket for service uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('service-uploads', 'service-uploads', false, 52428800); -- 50MB limit

-- Create service_uploads table to track uploads with expiry
CREATE TABLE public.service_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('program', 'sermon_audio')),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  uploaded_by UUID REFERENCES auth.users(id),
  is_expired BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(service_id, upload_type)
);

-- Enable RLS
ALTER TABLE public.service_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_uploads
-- Admins can manage uploads for their church
CREATE POLICY "Admins can manage service uploads"
ON public.service_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND church_id = service_uploads.church_id
      AND role IN ('church_admin', 'branch_admin')
  )
);

-- Members can view non-expired uploads for services they attended
CREATE POLICY "Members can view their service uploads"
ON public.service_uploads
FOR SELECT
USING (
  is_expired = false
  AND expires_at > now()
  AND EXISTS (
    SELECT 1 FROM public.attendance
    WHERE attendance.service_id = service_uploads.service_id
      AND attendance.member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
      )
  )
);

-- Storage policies for service-uploads bucket
-- Admins can upload files
CREATE POLICY "Admins can upload service files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'service-uploads'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('church_admin', 'branch_admin')
  )
);

-- Admins can view all files in their church
CREATE POLICY "Admins can view service files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'service-uploads'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('church_admin', 'branch_admin')
  )
);

-- Admins can delete files
CREATE POLICY "Admins can delete service files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'service-uploads'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('church_admin', 'branch_admin')
  )
);

-- Members can download files for services they attended (non-expired)
CREATE POLICY "Members can download attended service files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'service-uploads'
  AND EXISTS (
    SELECT 1 FROM public.service_uploads su
    JOIN public.attendance a ON a.service_id = su.service_id
    JOIN public.members m ON m.id = a.member_id
    WHERE su.storage_path = name
      AND m.user_id = auth.uid()
      AND su.is_expired = false
      AND su.expires_at > now()
  )
);