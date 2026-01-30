-- Create storage bucket for engagement content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'engagement-content',
  'engagement-content',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a']
);

-- Create table to track engagement attachments with expiry
CREATE TABLE public.engagement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('sermon_followup', 'daily_content')),
  reference_id uuid NOT NULL, -- ID of the sermon_followup_day or daily_church_content
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  is_expired boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.engagement_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Church admins can manage attachments"
ON public.engagement_attachments
FOR ALL
USING (is_church_admin(auth.uid(), church_id))
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Staff can view attachments in their church"
ON public.engagement_attachments
FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Members can view attachments for their church"
ON public.engagement_attachments
FOR SELECT
USING (
  church_id IN (
    SELECT members.church_id FROM members WHERE members.user_id = auth.uid()
  )
);

-- Storage policies for engagement-content bucket
CREATE POLICY "Church admins can upload engagement content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'engagement-content'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Church admins can update engagement content"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'engagement-content' AND auth.uid() IS NOT NULL);

CREATE POLICY "Church admins can delete engagement content"
ON storage.objects
FOR DELETE
USING (bucket_id = 'engagement-content' AND auth.uid() IS NOT NULL);

-- Authenticated users can read via signed URLs (handled by edge function)
CREATE POLICY "Authenticated users can read engagement content"
ON storage.objects
FOR SELECT
USING (bucket_id = 'engagement-content' AND auth.uid() IS NOT NULL);

-- Create index for efficient queries
CREATE INDEX idx_engagement_attachments_reference ON public.engagement_attachments(attachment_type, reference_id);
CREATE INDEX idx_engagement_attachments_expires ON public.engagement_attachments(expires_at) WHERE is_expired = false;