-- =====================================================
-- MEMBER ENGAGEMENT MODULE - ADDITIVE MIGRATION
-- Creates new tables for engagement features without modifying existing tables
-- =====================================================

-- Daily Church Content (Today at Church)
CREATE TABLE IF NOT EXISTS public.daily_church_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'devotional' CHECK (content_type IN ('devotional', 'announcement', 'encouragement', 'scripture')),
  media_url TEXT,
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prayer Requests
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  request_text TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'answered', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prayer Interactions (I prayed for this)
CREATE TABLE IF NOT EXISTS public.prayer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL DEFAULT 'prayed' CHECK (interaction_type IN ('prayed', 'encouraged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prayer_request_id, member_id, interaction_type)
);

-- Sermon Followup Plans (admin-created)
CREATE TABLE IF NOT EXISTS public.sermon_followup_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_enroll_attendees BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sermon Followup Days (daily content within a plan)
CREATE TABLE IF NOT EXISTS public.sermon_followup_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.sermon_followup_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scripture_reference TEXT,
  reflection_prompt TEXT,
  action_item TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, day_number)
);

-- Member Followup Enrollments
CREATE TABLE IF NOT EXISTS public.member_followup_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.sermon_followup_plans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'abandoned')),
  UNIQUE(plan_id, member_id)
);

-- Member Followup Progress (tracks each day completion)
CREATE TABLE IF NOT EXISTS public.member_followup_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.member_followup_enrollments(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES public.sermon_followup_days(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reflection_response TEXT,
  UNIQUE(enrollment_id, day_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.daily_church_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_followup_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_followup_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_followup_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_followup_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Daily Church Content
-- =====================================================
CREATE POLICY "Staff can view daily content in their church"
ON public.daily_church_content FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Members can view published daily content"
ON public.daily_church_content FOR SELECT
USING (
  is_published = true 
  AND publish_date <= CURRENT_DATE
  AND church_id IN (
    SELECT church_id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Church admins can manage daily content"
ON public.daily_church_content FOR ALL
USING (is_church_admin(auth.uid(), church_id))
WITH CHECK (is_church_admin(auth.uid(), church_id));

-- =====================================================
-- RLS POLICIES - Prayer Requests
-- =====================================================
CREATE POLICY "Staff can view all prayer requests in their church"
ON public.prayer_requests FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Members can view public prayer requests in their church"
ON public.prayer_requests FOR SELECT
USING (
  is_public = true 
  AND status = 'active'
  AND church_id IN (
    SELECT church_id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can create prayer requests"
ON public.prayer_requests FOR INSERT
WITH CHECK (
  church_id IN (
    SELECT church_id FROM public.members WHERE user_id = auth.uid()
  )
  AND (member_id IS NULL OR member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Members can update own prayer requests"
ON public.prayer_requests FOR UPDATE
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Church admins can manage all prayer requests"
ON public.prayer_requests FOR ALL
USING (is_church_admin(auth.uid(), church_id))
WITH CHECK (is_church_admin(auth.uid(), church_id));

-- =====================================================
-- RLS POLICIES - Prayer Interactions
-- =====================================================
CREATE POLICY "Members can view prayer interactions"
ON public.prayer_interactions FOR SELECT
USING (
  prayer_request_id IN (
    SELECT id FROM public.prayer_requests WHERE church_id IN (
      SELECT church_id FROM public.members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Members can add prayer interactions"
ON public.prayer_interactions FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete own prayer interactions"
ON public.prayer_interactions FOR DELETE
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - Sermon Followup Plans
-- =====================================================
CREATE POLICY "Staff can view followup plans in their church"
ON public.sermon_followup_plans FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Members can view active followup plans"
ON public.sermon_followup_plans FOR SELECT
USING (
  is_active = true 
  AND church_id IN (
    SELECT church_id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Church admins can manage followup plans"
ON public.sermon_followup_plans FOR ALL
USING (is_church_admin(auth.uid(), church_id))
WITH CHECK (is_church_admin(auth.uid(), church_id));

-- =====================================================
-- RLS POLICIES - Sermon Followup Days
-- =====================================================
CREATE POLICY "Staff can view followup days"
ON public.sermon_followup_days FOR SELECT
USING (
  plan_id IN (
    SELECT id FROM public.sermon_followup_plans WHERE church_id = get_user_church_id(auth.uid())
  )
);

CREATE POLICY "Members can view followup days for active plans"
ON public.sermon_followup_days FOR SELECT
USING (
  plan_id IN (
    SELECT id FROM public.sermon_followup_plans 
    WHERE is_active = true 
    AND church_id IN (
      SELECT church_id FROM public.members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Church admins can manage followup days"
ON public.sermon_followup_days FOR ALL
USING (
  plan_id IN (
    SELECT id FROM public.sermon_followup_plans WHERE is_church_admin(auth.uid(), church_id)
  )
)
WITH CHECK (
  plan_id IN (
    SELECT id FROM public.sermon_followup_plans WHERE is_church_admin(auth.uid(), church_id)
  )
);

-- =====================================================
-- RLS POLICIES - Member Followup Enrollments
-- =====================================================
CREATE POLICY "Members can view own enrollments"
ON public.member_followup_enrollments FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can enroll themselves"
ON public.member_followup_enrollments FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can update own enrollments"
ON public.member_followup_enrollments FOR UPDATE
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view enrollments in their church"
ON public.member_followup_enrollments FOR SELECT
USING (
  plan_id IN (
    SELECT id FROM public.sermon_followup_plans WHERE church_id = get_user_church_id(auth.uid())
  )
);

-- =====================================================
-- RLS POLICIES - Member Followup Progress
-- =====================================================
CREATE POLICY "Members can view own progress"
ON public.member_followup_progress FOR SELECT
USING (
  enrollment_id IN (
    SELECT id FROM public.member_followup_enrollments 
    WHERE member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Members can add own progress"
ON public.member_followup_progress FOR INSERT
WITH CHECK (
  enrollment_id IN (
    SELECT id FROM public.member_followup_enrollments 
    WHERE member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Staff can view progress in their church"
ON public.member_followup_progress FOR SELECT
USING (
  enrollment_id IN (
    SELECT id FROM public.member_followup_enrollments 
    WHERE plan_id IN (
      SELECT id FROM public.sermon_followup_plans WHERE church_id = get_user_church_id(auth.uid())
    )
  )
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_daily_content_church_date ON public.daily_church_content(church_id, publish_date);
CREATE INDEX IF NOT EXISTS idx_daily_content_published ON public.daily_church_content(church_id, is_published, publish_date);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_church ON public.prayer_requests(church_id, status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_member ON public.prayer_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_interactions_request ON public.prayer_interactions(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_sermon_plans_church ON public.sermon_followup_plans(church_id, is_active);
CREATE INDEX IF NOT EXISTS idx_followup_enrollments_member ON public.member_followup_enrollments(member_id, status);
CREATE INDEX IF NOT EXISTS idx_followup_enrollments_plan ON public.member_followup_enrollments(plan_id);
CREATE INDEX IF NOT EXISTS idx_followup_progress_enrollment ON public.member_followup_progress(enrollment_id);

-- =====================================================
-- Updated at triggers
-- =====================================================
CREATE TRIGGER update_daily_church_content_updated_at
  BEFORE UPDATE ON public.daily_church_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sermon_followup_plans_updated_at
  BEFORE UPDATE ON public.sermon_followup_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sermon_followup_days_updated_at
  BEFORE UPDATE ON public.sermon_followup_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();