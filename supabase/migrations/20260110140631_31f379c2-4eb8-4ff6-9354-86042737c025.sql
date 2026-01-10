-- Add explicit deny-all RLS policies for signup_otps table
-- This table should ONLY be accessed via service role in edge functions

-- Create explicit deny policy for anon role (SELECT)
CREATE POLICY "No anon access to signup_otps"
ON public.signup_otps
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create explicit deny policy for authenticated role (SELECT)
CREATE POLICY "No authenticated access to signup_otps"
ON public.signup_otps
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Also secure the password_reset_otps table (same vulnerability pattern)
CREATE POLICY "No anon access to password_reset_otps"
ON public.password_reset_otps
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "No authenticated access to password_reset_otps"
ON public.password_reset_otps
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Add comments explaining the security model
COMMENT ON TABLE public.signup_otps IS 'Service-role only: Contains signup verification OTPs. All access restricted to edge functions using service role key. No client access permitted.';
COMMENT ON TABLE public.password_reset_otps IS 'Service-role only: Contains password reset OTPs. All access restricted to edge functions using service role key. No client access permitted.';