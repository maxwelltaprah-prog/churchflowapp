-- Create an enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval_status column to members table
ALTER TABLE public.members 
ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending';

-- Add approved_at and approved_by columns
ALTER TABLE public.members 
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID;

-- Update existing members to be approved (so current members aren't blocked)
UPDATE public.members SET approval_status = 'approved' WHERE approval_status = 'pending';