-- Allow anyone to view church data (for public join flow, displaying church name, etc.)
CREATE POLICY "Anyone can view churches for joining" 
ON public.churches 
FOR SELECT 
USING (true);

-- Drop the existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view their church" ON public.churches;