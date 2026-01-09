-- Create table to store signup OTPs
CREATE TABLE public.signup_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookup
CREATE INDEX idx_signup_otps_email ON public.signup_otps(email);

-- Enable RLS
ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - only accessed via service role in edge functions

-- Create a function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.signup_otps
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;