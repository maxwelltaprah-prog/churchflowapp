-- Create visitor_checkins table for tracking visitor attendance
CREATE TABLE public.visitor_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checkin_method TEXT NOT NULL CHECK (checkin_method IN ('qr', 'manual')),
  checked_in_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(visitor_id, service_id)
);

-- Enable Row Level Security
ALTER TABLE public.visitor_checkins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can view visitor checkins in their church" 
ON public.visitor_checkins 
FOR SELECT 
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Branch staff can insert visitor checkins" 
ON public.visitor_checkins 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM visitors v 
    WHERE v.id = visitor_checkins.visitor_id 
    AND can_access_branch(auth.uid(), v.church_id, v.branch_id)
  )
);

CREATE POLICY "Branch staff can delete visitor checkins" 
ON public.visitor_checkins 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM visitors v 
    WHERE v.id = visitor_checkins.visitor_id 
    AND can_access_branch(auth.uid(), v.church_id, v.branch_id)
  )
);

-- Create index for performance
CREATE INDEX idx_visitor_checkins_visitor_id ON public.visitor_checkins(visitor_id);
CREATE INDEX idx_visitor_checkins_service_id ON public.visitor_checkins(service_id);
CREATE INDEX idx_visitor_checkins_church_id ON public.visitor_checkins(church_id);

-- Enable realtime for visitor_checkins
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_checkins;