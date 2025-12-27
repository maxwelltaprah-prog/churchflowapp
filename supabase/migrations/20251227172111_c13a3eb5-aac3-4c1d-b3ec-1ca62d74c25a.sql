-- Create groups/ministries table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create member_groups junction table for many-to-many relationship
CREATE TABLE public.member_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, group_id)
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for groups table
CREATE POLICY "Staff can view groups in their church"
ON public.groups FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can insert groups"
ON public.groups FOR INSERT
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update groups"
ON public.groups FOR UPDATE
USING (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can delete groups"
ON public.groups FOR DELETE
USING (is_church_admin(auth.uid(), church_id));

-- RLS policies for member_groups table
CREATE POLICY "Staff can view member_groups in their church"
ON public.member_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND g.church_id = get_user_church_id(auth.uid())
  )
);

CREATE POLICY "Branch staff can insert member_groups"
ON public.member_groups FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m
    JOIN public.groups g ON g.id = group_id
    WHERE m.id = member_id AND can_access_branch(auth.uid(), m.church_id, m.branch_id)
  )
);

CREATE POLICY "Branch staff can delete member_groups"
ON public.member_groups FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_id AND can_access_branch(auth.uid(), m.church_id, m.branch_id)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_groups_church_id ON public.groups(church_id);
CREATE INDEX idx_groups_branch_id ON public.groups(branch_id);
CREATE INDEX idx_member_groups_member_id ON public.member_groups(member_id);
CREATE INDEX idx_member_groups_group_id ON public.member_groups(group_id);