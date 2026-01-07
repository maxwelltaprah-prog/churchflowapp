-- Allow new member users to link their user_id during PIN creation
-- This policy allows a user to update ONLY the user_id field on a member record
-- when the member record has a phone that matches the auth email pattern

CREATE POLICY "Members can set their own user_id during PIN creation"
ON public.members
FOR UPDATE
USING (
  -- The member record must not already have a user_id (first time linking)
  user_id IS NULL
  AND phone IS NOT NULL
  -- The authenticated user's email must match the pattern: phone@churchflow.member
  AND (
    auth.email() = CONCAT(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '@churchflow.member')
    OR auth.email() = CONCAT(
      REPLACE(
        REPLACE(
          REPLACE(phone, '+233', '0'), -- Convert +233 to 0
          '+', ''
        ),
        ' ', ''
      ),
      '@churchflow.member'
    )
  )
)
WITH CHECK (
  -- Only allow setting user_id to the current authenticated user
  user_id = auth.uid()
);