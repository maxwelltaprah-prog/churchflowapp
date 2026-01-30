-- Create table to track member interactions with daily content (Today at Church)
CREATE TABLE public.content_interactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL REFERENCES public.daily_church_content(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL DEFAULT 'view' CHECK (interaction_type IN ('view', 'like', 'share', 'bookmark')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(content_id, member_id, interaction_type)
);

-- Enable RLS
ALTER TABLE public.content_interactions ENABLE ROW LEVEL SECURITY;

-- Members can insert their own interactions
CREATE POLICY "Members can create own interactions" 
ON public.content_interactions 
FOR INSERT 
WITH CHECK (
    member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
    )
);

-- Members can view their own interactions
CREATE POLICY "Members can view own interactions" 
ON public.content_interactions 
FOR SELECT 
USING (
    member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
    )
);

-- Members can delete their own interactions (unlike)
CREATE POLICY "Members can delete own interactions" 
ON public.content_interactions 
FOR DELETE 
USING (
    member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
    )
);

-- Staff can view all interactions in their church
CREATE POLICY "Staff can view interactions in their church" 
ON public.content_interactions 
FOR SELECT 
USING (church_id = get_user_church_id(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_content_interactions_content_id ON public.content_interactions(content_id);
CREATE INDEX idx_content_interactions_member_id ON public.content_interactions(member_id);
CREATE INDEX idx_content_interactions_church_id ON public.content_interactions(church_id);