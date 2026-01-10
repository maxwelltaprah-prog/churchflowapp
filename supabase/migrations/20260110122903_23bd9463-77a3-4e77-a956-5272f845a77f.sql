-- ============================================
-- CRITICAL SECURITY FIX: Restrict overly permissive RLS policies
-- ============================================

-- 1. Fix members table: Remove the overly permissive "Members can verify login by phone" policy
-- Phone verification is handled by secure edge functions using service role (no client RLS needed)
DROP POLICY IF EXISTS "Members can verify login by phone" ON public.members;

-- Add a proper policy for members to view their own record only
CREATE POLICY "Members can view own profile"
ON public.members
FOR SELECT
USING (user_id = auth.uid());

-- 2. Fix branches table: Create a more restrictive public view
-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view branch by join_code for joining" ON public.branches;

-- Create a view function that only returns safe branch data for joining (no PII)
CREATE OR REPLACE FUNCTION public.get_branch_for_joining(p_join_code text)
RETURNS TABLE (
  id uuid,
  church_id uuid,
  name text,
  location text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.church_id,
    b.name,
    b.location,
    b.is_active
  FROM branches b
  WHERE b.join_code = p_join_code
  AND b.is_active = true
  LIMIT 1;
$$;

-- Add policy for authenticated staff to view branches in their church
CREATE POLICY "Staff can view branches in their church"
ON public.branches
FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

-- 3. Fix churches table: Limit public access to non-sensitive columns
-- Create a safe function to get church info for joining (excludes settings)
CREATE OR REPLACE FUNCTION public.get_church_for_joining(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.logo_url
  FROM churches c
  WHERE c.slug = p_slug
  LIMIT 1;
$$;

-- Drop overly permissive church policy and replace with staff-only
DROP POLICY IF EXISTS "Anyone can view churches for joining" ON public.churches;

-- Staff can view their church
CREATE POLICY "Staff can view their church"
ON public.churches
FOR SELECT
USING (id = get_user_church_id(auth.uid()));

-- 4. Fix the "Always True" INSERT policies with proper checks
-- Fix: Authenticated users can insert initial branches - add church_id check
DROP POLICY IF EXISTS "Authenticated users can insert initial branches" ON public.branches;

-- Fix: Anyone can self-register as member - needs church context
DROP POLICY IF EXISTS "Anyone can self-register as member" ON public.members;

-- Re-create with proper security (using security definer function for self-registration)
CREATE OR REPLACE FUNCTION public.register_member_self(
  p_church_id uuid,
  p_branch_id uuid,
  p_full_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_gender gender_type DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_member_code text;
  v_qr_token text;
  v_church_settings jsonb;
BEGIN
  -- Verify church and branch exist and are active
  IF NOT EXISTS (
    SELECT 1 FROM churches WHERE id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Church not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM branches 
    WHERE id = p_branch_id 
    AND church_id = p_church_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Branch not found or inactive';
  END IF;

  -- Get church settings to check if self-registration is allowed
  SELECT settings INTO v_church_settings
  FROM churches WHERE id = p_church_id;

  IF NOT COALESCE((v_church_settings->>'allow_self_registration')::boolean, true) THEN
    RAISE EXCEPTION 'Self-registration is not allowed for this church';
  END IF;

  -- Generate member code and QR token
  v_member_code := generate_sequential_member_code(p_church_id);
  v_qr_token := encode(gen_random_bytes(32), 'hex');

  -- Insert the member
  INSERT INTO members (
    church_id, branch_id, full_name, phone, email, 
    gender, date_of_birth, member_code, qr_code_token,
    approval_status
  ) VALUES (
    p_church_id, p_branch_id, p_full_name, p_phone, p_email,
    p_gender, p_date_of_birth, v_member_code, v_qr_token,
    CASE WHEN COALESCE((v_church_settings->>'require_approval')::boolean, false) 
         THEN 'pending'::approval_status 
         ELSE 'approved'::approval_status 
    END
  )
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

-- 5. Fix "Authenticated users can create churches" with proper check
DROP POLICY IF EXISTS "Authenticated users can create churches" ON public.churches;

-- Create proper policy - only allow if user has no church yet
CREATE POLICY "Users without church can create one"
ON public.churches
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'church_admin'
  )
);

-- Grant execute on the new functions to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_branch_for_joining(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_church_for_joining(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.register_member_self(uuid, uuid, text, text, text, gender_type, date) TO authenticated, anon;