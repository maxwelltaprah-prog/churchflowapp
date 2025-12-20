-- Allow members to view their own attendance records
CREATE POLICY "Members can view own attendance"
ON public.attendance
FOR SELECT
USING (member_id IN (
  SELECT id FROM public.members WHERE user_id = auth.uid()
));