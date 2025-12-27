-- Add unique constraint for phone within church
CREATE UNIQUE INDEX IF NOT EXISTS members_phone_church_unique ON public.members (church_id, phone) WHERE phone IS NOT NULL;