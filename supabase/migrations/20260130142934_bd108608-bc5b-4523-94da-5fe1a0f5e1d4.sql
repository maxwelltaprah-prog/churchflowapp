-- Add RLS policy to allow members to view their own church
CREATE POLICY "Members can view their own church"
  ON public.churches
  FOR SELECT
  USING (
    id IN (
      SELECT church_id FROM public.members WHERE user_id = auth.uid()
    )
  );