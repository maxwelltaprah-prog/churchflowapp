-- =====================================
-- SMS CREDIT & CAMPAIGN SYSTEM TABLES
-- =====================================

-- 1. SMS Wallets - One per church (tenant)
CREATE TABLE public.sms_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL UNIQUE REFERENCES public.churches(id) ON DELETE CASCADE,
  balance_credits INTEGER NOT NULL DEFAULT 0,
  low_balance_threshold INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sms_wallets
ALTER TABLE public.sms_wallets ENABLE ROW LEVEL SECURITY;

-- Policies for sms_wallets
CREATE POLICY "Church admins can view wallet" 
ON public.sms_wallets FOR SELECT 
USING (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update wallet" 
ON public.sms_wallets FOR UPDATE 
USING (is_church_admin(auth.uid(), church_id));

-- Only system (edge functions with service role) can insert/update balance
-- Frontend can only read

-- 2. SMS Credit Purchases - Track Hubtel payments
CREATE TABLE public.sms_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  credits_purchased INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  hubtel_reference TEXT,
  hubtel_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sms_credit_purchases
ALTER TABLE public.sms_credit_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for sms_credit_purchases
CREATE POLICY "Church admins can view purchases" 
ON public.sms_credit_purchases FOR SELECT 
USING (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can insert purchases" 
ON public.sms_credit_purchases FOR INSERT 
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update purchases" 
ON public.sms_credit_purchases FOR UPDATE 
USING (is_church_admin(auth.uid(), church_id));

-- 3. SMS Templates
CREATE TABLE public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sms_templates
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Policies for sms_templates
CREATE POLICY "Staff can view templates" 
ON public.sms_templates FOR SELECT 
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can insert templates" 
ON public.sms_templates FOR INSERT 
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update templates" 
ON public.sms_templates FOR UPDATE 
USING (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can delete templates" 
ON public.sms_templates FOR DELETE 
USING (is_church_admin(auth.uid(), church_id));

-- 4. SMS Campaigns
CREATE TABLE public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  audience_type TEXT NOT NULL, -- all_members, group, individual
  audience_group_ids UUID[] DEFAULT '{}',
  audience_member_ids UUID[] DEFAULT '{}',
  message_body TEXT NOT NULL,
  use_first_name BOOLEAN NOT NULL DEFAULT false,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  segments INTEGER NOT NULL DEFAULT 1,
  credits_deducted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, sending, completed, failed
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on sms_campaigns
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for sms_campaigns
CREATE POLICY "Staff can view campaigns" 
ON public.sms_campaigns FOR SELECT 
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can insert campaigns" 
ON public.sms_campaigns FOR INSERT 
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update campaigns" 
ON public.sms_campaigns FOR UPDATE 
USING (is_church_admin(auth.uid(), church_id));

-- 5. SMS Jobs - Individual message tracking
CREATE TABLE public.sms_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  member_name TEXT,
  personalized_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Enable RLS on sms_jobs
ALTER TABLE public.sms_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for sms_jobs
CREATE POLICY "Staff can view jobs" 
ON public.sms_jobs FOR SELECT 
USING (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can insert jobs" 
ON public.sms_jobs FOR INSERT 
WITH CHECK (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update jobs" 
ON public.sms_jobs FOR UPDATE 
USING (is_church_admin(auth.uid(), church_id));

-- Create indexes for performance
CREATE INDEX idx_sms_campaigns_church_id ON public.sms_campaigns(church_id);
CREATE INDEX idx_sms_campaigns_status ON public.sms_campaigns(status);
CREATE INDEX idx_sms_jobs_campaign_id ON public.sms_jobs(campaign_id);
CREATE INDEX idx_sms_jobs_status ON public.sms_jobs(status);
CREATE INDEX idx_sms_credit_purchases_church_id ON public.sms_credit_purchases(church_id);

-- Trigger to update updated_at
CREATE TRIGGER update_sms_wallets_updated_at
  BEFORE UPDATE ON public.sms_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_credit_purchases_updated_at
  BEFORE UPDATE ON public.sms_credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();