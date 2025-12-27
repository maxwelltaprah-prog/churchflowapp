-- Add new columns to members table for tiered registration form
-- These columns support the membership form fields that were missing

-- Create enums for the new fields
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
    CREATE TYPE member_type AS ENUM ('regular', 'occasional', 'worker');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'how_heard') THEN
    CREATE TYPE how_heard AS ENUM ('friend_family', 'social_media', 'walk_in', 'outreach', 'other');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marital_status') THEN
    CREATE TYPE marital_status AS ENUM ('single', 'married', 'divorced', 'widowed');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occupation_type') THEN
    CREATE TYPE occupation_type AS ENUM ('student', 'public_sector', 'private_sector', 'self_employed', 'unemployed', 'other');
  END IF;
END $$;

-- Add 'prefer_not_to_say' to gender_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'prefer_not_to_say' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gender_type')
  ) THEN
    ALTER TYPE gender_type ADD VALUE IF NOT EXISTS 'prefer_not_to_say';
  END IF;
END $$;

-- Add 'first_timer' to membership_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'first_timer' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'membership_status')
  ) THEN
    ALTER TYPE membership_status ADD VALUE IF NOT EXISTS 'first_timer';
  END IF;
END $$;

-- Add new columns to members table
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS member_type member_type,
  ADD COLUMN IF NOT EXISTS how_heard how_heard,
  ADD COLUMN IF NOT EXISTS residential_area TEXT,
  ADD COLUMN IF NOT EXISTS marital_status marital_status,
  ADD COLUMN IF NOT EXISTS occupation occupation_type,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS date_joined DATE DEFAULT CURRENT_DATE;