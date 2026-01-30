-- Add RLS policy to allow members to view all services in their branch
-- This enables the "missed services" feature in the member portal streak section
CREATE POLICY "Members can view services in their branch"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND m.church_id = services.church_id
        AND (m.branch_id = services.branch_id OR services.branch_id IN (
          SELECT id FROM public.branches WHERE church_id = m.church_id
        ))
    )
  );