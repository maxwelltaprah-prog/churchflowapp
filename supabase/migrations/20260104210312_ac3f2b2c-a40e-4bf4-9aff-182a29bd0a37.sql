-- Create spiritual_journeys table for admin-managed options
CREATE TABLE public.spiritual_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for member-spiritual_journey relationships
CREATE TABLE public.member_spiritual_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  spiritual_journey_id UUID NOT NULL REFERENCES public.spiritual_journeys(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, spiritual_journey_id)
);

-- Enable RLS
ALTER TABLE public.spiritual_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_spiritual_journeys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spiritual_journeys
CREATE POLICY "Staff can view spiritual journeys in their church"
ON public.spiritual_journeys FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can insert spiritual journeys"
ON public.spiritual_journeys FOR INSERT
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update spiritual journeys"
ON public.spiritual_journeys FOR UPDATE
USING (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can delete spiritual journeys"
ON public.spiritual_journeys FOR DELETE
USING (is_church_admin(auth.uid(), church_id));

-- RLS Policies for member_spiritual_journeys
CREATE POLICY "Staff can view member spiritual journeys in their church"
ON public.member_spiritual_journeys FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.spiritual_journeys sj
  WHERE sj.id = member_spiritual_journeys.spiritual_journey_id
  AND sj.church_id = get_user_church_id(auth.uid())
));

CREATE POLICY "Branch staff can insert member spiritual journeys"
ON public.member_spiritual_journeys FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.members m
  JOIN public.spiritual_journeys sj ON sj.id = member_spiritual_journeys.spiritual_journey_id
  WHERE m.id = member_spiritual_journeys.member_id
  AND can_access_branch(auth.uid(), m.church_id, m.branch_id)
));

CREATE POLICY "Branch staff can delete member spiritual journeys"
ON public.member_spiritual_journeys FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id = member_spiritual_journeys.member_id
  AND can_access_branch(auth.uid(), m.church_id, m.branch_id)
));

-- Add triggers for updated_at
CREATE TRIGGER update_spiritual_journeys_updated_at
BEFORE UPDATE ON public.spiritual_journeys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();