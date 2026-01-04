
-- Remove new_convert from membership_status enum
-- First, update any existing records with new_convert to member
UPDATE public.members 
SET membership_status = 'member' 
WHERE membership_status = 'new_convert';

-- Drop the default before changing type
ALTER TABLE public.members ALTER COLUMN membership_status DROP DEFAULT;

-- Create a new enum type without new_convert
CREATE TYPE public.membership_status_new AS ENUM ('member', 'visitor', 'first_timer');

-- Update the column to use the new enum
ALTER TABLE public.members 
  ALTER COLUMN membership_status TYPE public.membership_status_new 
  USING membership_status::text::public.membership_status_new;

-- Drop the old enum and rename the new one
DROP TYPE public.membership_status;
ALTER TYPE public.membership_status_new RENAME TO membership_status;

-- Restore default
ALTER TABLE public.members ALTER COLUMN membership_status SET DEFAULT 'visitor'::membership_status;
