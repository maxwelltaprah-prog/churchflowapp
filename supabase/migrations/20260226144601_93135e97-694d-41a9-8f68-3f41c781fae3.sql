-- Add unique constraint on email to prevent race condition duplicates
ALTER TABLE public.signup_otps ADD CONSTRAINT signup_otps_email_unique UNIQUE (email);

-- Also add to password_reset_otps for same protection
ALTER TABLE public.password_reset_otps ADD CONSTRAINT password_reset_otps_email_unique UNIQUE (email);