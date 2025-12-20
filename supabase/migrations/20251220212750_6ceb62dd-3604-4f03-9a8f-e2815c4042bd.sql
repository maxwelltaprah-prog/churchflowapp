-- Allow authenticated users to insert a new church (during signup)
CREATE POLICY "Authenticated users can create churches" 
ON public.churches 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert branches for churches they're creating
-- This is needed during signup when the user creates their first branch
CREATE POLICY "Authenticated users can insert initial branches" 
ON public.branches 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert their own user_roles
-- This is needed during signup when assigning church_admin role
CREATE POLICY "Authenticated users can insert own roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());