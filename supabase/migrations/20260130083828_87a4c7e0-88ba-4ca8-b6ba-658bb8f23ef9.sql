-- Add RLS policy for members to view their own tithe payments
CREATE POLICY "Members can view their own tithe payments"
ON public.tithe_payments
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);