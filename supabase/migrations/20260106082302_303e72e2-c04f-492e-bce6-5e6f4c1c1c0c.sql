-- Create visitor status enum
CREATE TYPE visitor_status AS ENUM ('new', 'in_follow_up', 'converted');

-- Create followup type enum
CREATE TYPE followup_type AS ENUM ('sms', 'phone_call', 'visit', 'other');

-- Create visitors table
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  first_visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  how_heard how_heard NOT NULL,
  status visitor_status NOT NULL DEFAULT 'new',
  converted_member_id UUID REFERENCES public.members(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visitor_followups table
CREATE TABLE public.visitor_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  followup_date DATE NOT NULL,
  followup_type followup_type NOT NULL,
  notes TEXT,
  conducted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on visitors
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Enable RLS on visitor_followups
ALTER TABLE public.visitor_followups ENABLE ROW LEVEL SECURITY;

-- Visitors RLS Policies
CREATE POLICY "Staff can view visitors in their church"
ON public.visitors FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Branch staff can insert visitors"
ON public.visitors FOR INSERT
WITH CHECK (can_access_branch(auth.uid(), church_id, branch_id));

CREATE POLICY "Branch staff can update visitors"
ON public.visitors FOR UPDATE
USING (can_access_branch(auth.uid(), church_id, branch_id));

CREATE POLICY "Branch staff can delete visitors"
ON public.visitors FOR DELETE
USING (can_access_branch(auth.uid(), church_id, branch_id));

-- Visitor Followups RLS Policies
CREATE POLICY "Staff can view followups in their church"
ON public.visitor_followups FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Staff can insert followups"
ON public.visitor_followups FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.visitors v
  WHERE v.id = visitor_id AND can_access_branch(auth.uid(), v.church_id, v.branch_id)
));

CREATE POLICY "Staff can delete followups"
ON public.visitor_followups FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.visitors v
  WHERE v.id = visitor_id AND can_access_branch(auth.uid(), v.church_id, v.branch_id)
));

-- Create trigger for updated_at on visitors
CREATE TRIGGER update_visitors_updated_at
BEFORE UPDATE ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_visitors_church_id ON public.visitors(church_id);
CREATE INDEX idx_visitors_branch_id ON public.visitors(branch_id);
CREATE INDEX idx_visitors_status ON public.visitors(status);
CREATE INDEX idx_visitor_followups_visitor_id ON public.visitor_followups(visitor_id);
CREATE INDEX idx_visitor_followups_church_id ON public.visitor_followups(church_id);