
-- Add overseer fields to branches table
ALTER TABLE public.branches
ADD COLUMN overseer_name text,
ADD COLUMN overseer_phone text,
ADD COLUMN overseer_email text;
