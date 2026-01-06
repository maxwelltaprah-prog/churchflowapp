-- Add delivery_status column to sms_jobs table
ALTER TABLE public.sms_jobs 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups by provider_message_id
CREATE INDEX IF NOT EXISTS idx_sms_jobs_provider_message_id ON public.sms_jobs(provider_message_id);

-- Enable realtime for sms_jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_jobs;