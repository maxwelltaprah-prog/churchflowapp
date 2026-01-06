-- Create notifications table for admin alerts
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Church admins can view notifications
CREATE POLICY "Church admins can view notifications"
ON public.admin_notifications
FOR SELECT
USING (is_church_admin(auth.uid(), church_id));

-- Church admins can update notifications (mark as read)
CREATE POLICY "Church admins can update notifications"
ON public.admin_notifications
FOR UPDATE
USING (is_church_admin(auth.uid(), church_id));

-- Church admins can delete notifications
CREATE POLICY "Church admins can delete notifications"
ON public.admin_notifications
FOR DELETE
USING (is_church_admin(auth.uid(), church_id));

-- Create index for faster queries
CREATE INDEX idx_admin_notifications_church_id ON public.admin_notifications(church_id);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);