-- Add RLS policy for members to view services they attended
CREATE POLICY "Members can view services for their attendance" 
ON public.services 
FOR SELECT 
USING (
  id IN (
    SELECT service_id FROM attendance 
    WHERE member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  )
);

-- Also allow members to view their attendance through the attendance table
-- (This should already work, but let's ensure it)
