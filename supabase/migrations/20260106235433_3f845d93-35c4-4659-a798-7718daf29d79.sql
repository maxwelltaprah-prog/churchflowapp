-- =====================================================
-- ADMIN MANAGEMENT REDESIGN: Member-based Admin System
-- =====================================================

-- 1. Add member_id reference to user_roles to link admin to member
ALTER TABLE public.user_roles 
ADD COLUMN member_id uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- 2. Add is_active flag for soft revocation (keeps history)
ALTER TABLE public.user_roles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- 3. Create admin_menu_permissions table for granular menu access
CREATE TABLE public.admin_menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, menu_key)
);

-- Enable RLS on admin_menu_permissions
ALTER TABLE public.admin_menu_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_menu_permissions
CREATE POLICY "Church admins can manage menu permissions"
ON public.admin_menu_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.id = admin_menu_permissions.user_role_id
    AND is_church_admin(auth.uid(), ur.church_id)
  )
);

CREATE POLICY "Users can view own menu permissions"
ON public.admin_menu_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.id = admin_menu_permissions.user_role_id
    AND ur.user_id = auth.uid()
  )
);

-- 4. Create admin_branch_permissions table for granular branch access
-- This replaces the branch_id in user_roles for more flexibility
CREATE TABLE public.admin_branch_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, branch_id)
);

-- Enable RLS on admin_branch_permissions
ALTER TABLE public.admin_branch_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_branch_permissions
CREATE POLICY "Church admins can manage branch permissions"
ON public.admin_branch_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.id = admin_branch_permissions.user_role_id
    AND is_church_admin(auth.uid(), ur.church_id)
  )
);

CREATE POLICY "Users can view own branch permissions"
ON public.admin_branch_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.id = admin_branch_permissions.user_role_id
    AND ur.user_id = auth.uid()
  )
);

-- 5. Create helper function to check if user has menu access
CREATE OR REPLACE FUNCTION public.has_menu_access(_user_id uuid, _church_id uuid, _menu_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.admin_menu_permissions amp ON amp.user_role_id = ur.id
    WHERE ur.user_id = _user_id
      AND ur.church_id = _church_id
      AND ur.is_active = true
      AND (
        -- Church admins have access to all menus
        ur.role = 'church_admin'
        OR 
        -- Other roles need explicit permission
        amp.menu_key = _menu_key
      )
  )
$$;

-- 6. Create helper function to get user's accessible branches for a church
CREATE OR REPLACE FUNCTION public.get_accessible_branches(_user_id uuid, _church_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
        AND church_id = _church_id 
        AND role = 'church_admin'
        AND is_active = true
    ) THEN (
      SELECT ARRAY_AGG(id) FROM public.branches WHERE church_id = _church_id
    )
    ELSE (
      SELECT ARRAY_AGG(DISTINCT abp.branch_id)
      FROM public.user_roles ur
      JOIN public.admin_branch_permissions abp ON abp.user_role_id = ur.id
      WHERE ur.user_id = _user_id
        AND ur.church_id = _church_id
        AND ur.is_active = true
    )
  END
$$;

-- 7. Create helper function to get user's menu permissions for a church
CREATE OR REPLACE FUNCTION public.get_menu_permissions(_user_id uuid, _church_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
        AND church_id = _church_id 
        AND role = 'church_admin'
        AND is_active = true
    ) THEN 
      -- Church admins get all menus
      ARRAY['dashboard', 'members', 'visitors', 'groups', 'branches', 'services', 
            'checkin', 'analytics', 'broadcasts', 'sms', 'spiritual-journey', 'admins', 'settings']
    ELSE (
      SELECT ARRAY_AGG(DISTINCT amp.menu_key)
      FROM public.user_roles ur
      JOIN public.admin_menu_permissions amp ON amp.user_role_id = ur.id
      WHERE ur.user_id = _user_id
        AND ur.church_id = _church_id
        AND ur.is_active = true
    )
  END
$$;

-- 8. Create index for better performance
CREATE INDEX idx_user_roles_member_id ON public.user_roles(member_id);
CREATE INDEX idx_user_roles_active ON public.user_roles(user_id, church_id, is_active);
CREATE INDEX idx_admin_menu_permissions_role ON public.admin_menu_permissions(user_role_id);
CREATE INDEX idx_admin_branch_permissions_role ON public.admin_branch_permissions(user_role_id);