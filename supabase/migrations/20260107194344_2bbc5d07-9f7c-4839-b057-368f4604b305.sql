-- Drop the previous policy and create a more robust one
DROP POLICY IF EXISTS "Members can set their own user_id during PIN creation" ON public.members;

-- Create a helper function to normalize phone numbers for auth email matching
CREATE OR REPLACE FUNCTION public.normalize_phone_for_auth(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digits_only text;
BEGIN
  -- Remove all non-digits
  digits_only := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
  
  -- If starts with 233 (Ghana country code), convert to local format
  IF digits_only LIKE '233%' AND LENGTH(digits_only) >= 12 THEN
    digits_only := '0' || SUBSTRING(digits_only FROM 4);
  END IF;
  
  RETURN digits_only;
END;
$$;

-- Create a more robust policy that uses the normalization function
CREATE POLICY "Members can set their own user_id during PIN creation"
ON public.members
FOR UPDATE
USING (
  -- The member record must not already have a user_id (first time linking)
  user_id IS NULL
  AND phone IS NOT NULL
  -- The authenticated user's email must match the normalized phone pattern
  AND auth.email() = CONCAT(normalize_phone_for_auth(phone), '@churchflow.member')
)
WITH CHECK (
  -- Only allow setting user_id to the current authenticated user
  user_id = auth.uid()
);