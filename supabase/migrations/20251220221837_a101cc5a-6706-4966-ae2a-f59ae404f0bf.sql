-- Drop the restrictive self-register policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can self-register as member" ON public.members;

-- Create a PERMISSIVE policy (default) for public member registration
CREATE POLICY "Anyone can self-register as member" 
ON public.members 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);