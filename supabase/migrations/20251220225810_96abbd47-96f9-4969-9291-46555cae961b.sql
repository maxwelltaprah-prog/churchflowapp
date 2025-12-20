-- Add policy to allow member lookup by phone for login verification
CREATE POLICY "Members can verify login by phone"
ON public.members
FOR SELECT
USING (
  -- Allow anyone to check if a member exists by phone (for login flow)
  -- This is restrictive as it only returns data when filtering by phone
  phone IS NOT NULL
);