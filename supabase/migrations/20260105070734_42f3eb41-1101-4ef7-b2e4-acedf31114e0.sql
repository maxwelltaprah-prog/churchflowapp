-- 1. Update membership_status enum from member/visitor/first_timer to active/inactive/transferred
-- First, create a new enum type
CREATE TYPE public.membership_status_new AS ENUM ('active', 'inactive', 'transferred');

-- Map existing values to new values:
-- 'member' -> 'active' (approved/valid/current)
-- 'visitor' -> 'active' (valid members attending)
-- 'first_timer' -> 'active' (pending/new but still valid status)

-- Update the column to use the new type with mapping
ALTER TABLE public.members 
  ALTER COLUMN membership_status DROP DEFAULT;

-- Alter column type with explicit cast
ALTER TABLE public.members 
  ALTER COLUMN membership_status TYPE public.membership_status_new 
  USING (
    CASE membership_status::text
      WHEN 'member' THEN 'active'::public.membership_status_new
      WHEN 'visitor' THEN 'active'::public.membership_status_new
      WHEN 'first_timer' THEN 'active'::public.membership_status_new
      ELSE 'active'::public.membership_status_new
    END
  );

-- Set default for new records
ALTER TABLE public.members 
  ALTER COLUMN membership_status SET DEFAULT 'active'::public.membership_status_new;

-- Drop the old enum type
DROP TYPE public.membership_status;

-- Rename the new enum to the original name
ALTER TYPE public.membership_status_new RENAME TO membership_status;

-- 2. Add emergency contact fields to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;