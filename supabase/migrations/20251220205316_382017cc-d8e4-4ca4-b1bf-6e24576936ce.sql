-- ===========================================
-- ENUMS
-- ===========================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('church_admin', 'branch_admin', 'usher', 'member');

-- Membership status enum
CREATE TYPE public.membership_status AS ENUM ('member', 'visitor', 'new_convert');

-- Gender enum
CREATE TYPE public.gender_type AS ENUM ('male', 'female');

-- Check-in method enum
CREATE TYPE public.checkin_method AS ENUM ('staff_scan', 'self_scan');

-- ===========================================
-- CHURCHES TABLE (Tenants)
-- ===========================================

CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{"allow_self_registration": true, "require_approval": false, "allow_cross_branch_checkin": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- BRANCHES TABLE
-- ===========================================

CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  join_code TEXT NOT NULL UNIQUE,
  is_main_branch BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_branches_church_id ON public.branches(church_id);
CREATE INDEX idx_branches_join_code ON public.branches(join_code);

-- ===========================================
-- PROFILES TABLE (Auth Users Metadata)
-- ===========================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_church_id ON public.profiles(church_id);

-- ===========================================
-- USER ROLES TABLE (Separate from profiles for security)
-- ===========================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, church_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_church_id ON public.user_roles(church_id);

-- ===========================================
-- MEMBERS TABLE
-- ===========================================

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gender gender_type,
  date_of_birth DATE,
  membership_status membership_status DEFAULT 'visitor',
  member_code TEXT NOT NULL UNIQUE,
  qr_code_token TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  area_zone TEXT,
  ministry_group TEXT,
  is_active BOOLEAN DEFAULT true,
  registered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_members_church_id ON public.members(church_id);
CREATE INDEX idx_members_branch_id ON public.members(branch_id);
CREATE INDEX idx_members_qr_code_token ON public.members(qr_code_token);
CREATE INDEX idx_members_member_code ON public.members(member_code);
CREATE INDEX idx_members_phone ON public.members(phone);

-- ===========================================
-- SERVICES TABLE
-- ===========================================

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  service_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_services_church_id ON public.services(church_id);
CREATE INDEX idx_services_branch_id ON public.services(branch_id);
CREATE INDEX idx_services_date ON public.services(service_date);

-- ===========================================
-- ATTENDANCE TABLE
-- ===========================================

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checked_in_by UUID REFERENCES auth.users(id),
  checkin_method checkin_method DEFAULT 'staff_scan',
  is_cross_branch BOOLEAN DEFAULT false,
  member_home_branch_id UUID REFERENCES public.branches(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(service_id, member_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_attendance_church_id ON public.attendance(church_id);
CREATE INDEX idx_attendance_branch_id ON public.attendance(branch_id);
CREATE INDEX idx_attendance_service_id ON public.attendance(service_id);
CREATE INDEX idx_attendance_member_id ON public.attendance(member_id);
CREATE INDEX idx_attendance_checked_in_at ON public.attendance(checked_in_at);

-- ===========================================
-- BROADCASTS TABLE
-- ===========================================

CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_scope TEXT DEFAULT 'all', -- 'all', 'branch', 'group', 'absentees'
  target_filter JSONB,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_count INTEGER DEFAULT 0
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_broadcasts_church_id ON public.broadcasts(church_id);

-- ===========================================
-- SECURITY DEFINER FUNCTIONS (Avoid RLS recursion)
-- ===========================================

-- Function to check if user has a specific role in a church
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _church_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND church_id = _church_id
      AND role = _role
  )
$$;

-- Function to check if user has any admin role in a church
CREATE OR REPLACE FUNCTION public.is_church_admin(_user_id UUID, _church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND church_id = _church_id
      AND role = 'church_admin'
  )
$$;

-- Function to check if user is branch admin or higher
CREATE OR REPLACE FUNCTION public.is_branch_admin(_user_id UUID, _church_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND church_id = _church_id
      AND (
        role = 'church_admin'
        OR (role = 'branch_admin' AND branch_id = _branch_id)
      )
  )
$$;

-- Function to check if user can access branch (admin, branch_admin, or usher)
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id UUID, _church_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND church_id = _church_id
      AND (
        role = 'church_admin'
        OR (role IN ('branch_admin', 'usher') AND branch_id = _branch_id)
      )
  )
$$;

-- Function to get user's church_id
CREATE OR REPLACE FUNCTION public.get_user_church_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT church_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- ===========================================
-- RLS POLICIES: CHURCHES
-- ===========================================

-- Church admins can view their church
CREATE POLICY "Users can view their church"
  ON public.churches FOR SELECT
  USING (
    id = public.get_user_church_id(auth.uid())
  );

-- Only church admins can update their church
CREATE POLICY "Church admins can update their church"
  ON public.churches FOR UPDATE
  USING (public.is_church_admin(auth.uid(), id));

-- ===========================================
-- RLS POLICIES: BRANCHES
-- ===========================================

-- Users can view branches in their church
CREATE POLICY "Users can view branches in their church"
  ON public.branches FOR SELECT
  USING (church_id = public.get_user_church_id(auth.uid()));

-- Church admins can insert branches
CREATE POLICY "Church admins can insert branches"
  ON public.branches FOR INSERT
  WITH CHECK (public.is_church_admin(auth.uid(), church_id));

-- Church admins can update branches
CREATE POLICY "Church admins can update branches"
  ON public.branches FOR UPDATE
  USING (public.is_church_admin(auth.uid(), church_id));

-- ===========================================
-- RLS POLICIES: PROFILES
-- ===========================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Users in same church can view each other's profiles
CREATE POLICY "Users can view profiles in their church"
  ON public.profiles FOR SELECT
  USING (church_id = public.get_user_church_id(auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ===========================================
-- RLS POLICIES: USER_ROLES
-- ===========================================

-- Church admins can view roles in their church
CREATE POLICY "Admins can view roles in their church"
  ON public.user_roles FOR SELECT
  USING (public.is_church_admin(auth.uid(), church_id));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Church admins can insert roles
CREATE POLICY "Church admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_church_admin(auth.uid(), church_id));

-- Church admins can delete roles
CREATE POLICY "Church admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.is_church_admin(auth.uid(), church_id));

-- ===========================================
-- RLS POLICIES: MEMBERS
-- ===========================================

-- Staff can view members in their church
CREATE POLICY "Staff can view members in their church"
  ON public.members FOR SELECT
  USING (church_id = public.get_user_church_id(auth.uid()));

-- Branch staff can insert members
CREATE POLICY "Branch staff can insert members"
  ON public.members FOR INSERT
  WITH CHECK (public.can_access_branch(auth.uid(), church_id, branch_id));

-- Branch staff can update members in their branch
CREATE POLICY "Branch staff can update members"
  ON public.members FOR UPDATE
  USING (public.can_access_branch(auth.uid(), church_id, branch_id));

-- ===========================================
-- RLS POLICIES: SERVICES
-- ===========================================

-- Staff can view services in their church
CREATE POLICY "Staff can view services in their church"
  ON public.services FOR SELECT
  USING (church_id = public.get_user_church_id(auth.uid()));

-- Branch admins can insert services
CREATE POLICY "Branch admins can insert services"
  ON public.services FOR INSERT
  WITH CHECK (public.is_branch_admin(auth.uid(), church_id, branch_id));

-- Branch admins can update services
CREATE POLICY "Branch admins can update services"
  ON public.services FOR UPDATE
  USING (public.is_branch_admin(auth.uid(), church_id, branch_id));

-- ===========================================
-- RLS POLICIES: ATTENDANCE
-- ===========================================

-- Staff can view attendance in their church
CREATE POLICY "Staff can view attendance in their church"
  ON public.attendance FOR SELECT
  USING (church_id = public.get_user_church_id(auth.uid()));

-- Branch staff can insert attendance
CREATE POLICY "Branch staff can insert attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (public.can_access_branch(auth.uid(), church_id, branch_id));

-- ===========================================
-- RLS POLICIES: BROADCASTS
-- ===========================================

-- Users can view broadcasts in their church
CREATE POLICY "Users can view broadcasts in their church"
  ON public.broadcasts FOR SELECT
  USING (church_id = public.get_user_church_id(auth.uid()));

-- Branch admins can insert broadcasts
CREATE POLICY "Branch admins can insert broadcasts"
  ON public.broadcasts FOR INSERT
  WITH CHECK (public.is_branch_admin(auth.uid(), church_id, branch_id));

-- ===========================================
-- TRIGGERS: Auto-update timestamps
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- TRIGGER: Auto-create profile on user signup
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- HELPER FUNCTION: Generate unique codes
-- ===========================================

CREATE OR REPLACE FUNCTION public.generate_member_code(_church_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(_church_slug) || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.members WHERE member_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_branch_code(_church_slug TEXT, _branch_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  branch_prefix TEXT;
BEGIN
  branch_prefix := UPPER(LEFT(REGEXP_REPLACE(_branch_name, '[^a-zA-Z]', '', 'g'), 3));
  LOOP
    new_code := UPPER(_church_slug) || '-' || branch_prefix || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    SELECT EXISTS(SELECT 1 FROM public.branches WHERE join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;