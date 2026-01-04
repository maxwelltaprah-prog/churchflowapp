-- Add baptism status to members table (optional boolean field)
ALTER TABLE public.members ADD COLUMN is_baptized boolean DEFAULT NULL;