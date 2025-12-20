-- Add a SELECT policy to allow anyone to read branch by join_code (for public joining)
CREATE POLICY "Anyone can view branch by join_code for joining" 
ON public.branches 
FOR SELECT 
USING (true);

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view branches in their church" ON public.branches;