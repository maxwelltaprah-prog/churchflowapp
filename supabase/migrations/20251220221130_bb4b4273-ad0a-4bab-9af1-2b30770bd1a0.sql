-- Allow anyone to insert into members table for self-registration (public join)
CREATE POLICY "Anyone can self-register as member" 
ON public.members 
FOR INSERT 
WITH CHECK (true);