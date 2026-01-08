-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active', 
  'past_due',
  'canceled',
  'expired_locked'
);

-- Create subscriptions table (one per church/org)
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id uuid NOT NULL UNIQUE REFERENCES public.churches(id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  
  -- Trial fields
  trial_start_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_end_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  trial_peak_total_members integer NOT NULL DEFAULT 0,
  trial_peak_total_branches integer NOT NULL DEFAULT 1,
  
  -- Lock field
  locked_at timestamp with time zone,
  
  -- Paystack fields
  paystack_customer_code text,
  paystack_plan_code text,
  paystack_subscription_code text,
  paystack_email text,
  
  -- Pricing
  current_amount_ghs integer NOT NULL DEFAULT 99, -- expected monthly amount in GHS
  currency text NOT NULL DEFAULT 'GHS',
  
  -- Discount tracking
  early_discount_applied boolean NOT NULL DEFAULT false,
  first_payment_completed boolean NOT NULL DEFAULT false,
  
  -- Audit fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create subscription events table for webhook logs + idempotency
CREATE TABLE public.subscription_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  event_id text NOT NULL UNIQUE, -- Paystack event reference for idempotency
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Church admins can view their subscription"
ON public.subscriptions FOR SELECT
USING (is_church_admin(auth.uid(), church_id));

CREATE POLICY "Church admins can update their subscription"
ON public.subscriptions FOR UPDATE
USING (is_church_admin(auth.uid(), church_id));

-- RLS Policies for subscription events (read-only for admins)
CREATE POLICY "Church admins can view subscription events"
ON public.subscription_events FOR SELECT
USING (is_church_admin(auth.uid(), church_id));

-- Function to compute pricing
CREATE OR REPLACE FUNCTION public.compute_subscription_price(
  p_members integer,
  p_branches integer
)
RETURNS TABLE (
  tier_price integer,
  extra_branches integer,
  branch_addon integer,
  total_ghs integer
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Calculate tier based on total members
  IF p_members < 150 THEN
    tier_price := 99;
  ELSIF p_members <= 5000 THEN
    tier_price := 299;
  ELSE
    tier_price := 599;
  END IF;
  
  -- Calculate branch addon (first branch included)
  extra_branches := GREATEST(0, p_branches - 1);
  branch_addon := extra_branches * 100;
  
  -- Calculate total
  total_ghs := tier_price + branch_addon;
  
  RETURN NEXT;
END;
$$;

-- Function to get current totals for a church
CREATE OR REPLACE FUNCTION public.get_church_totals(p_church_id uuid)
RETURNS TABLE (
  total_members bigint,
  total_branches bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COUNT(*) INTO total_members
  FROM members
  WHERE church_id = p_church_id;
  
  SELECT COUNT(*) INTO total_branches
  FROM branches
  WHERE church_id = p_church_id AND is_active = true;
  
  RETURN NEXT;
END;
$$;

-- Function to update peak totals during trial
CREATE OR REPLACE FUNCTION public.update_trial_peaks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id uuid;
  v_current_members bigint;
  v_current_branches bigint;
BEGIN
  -- Determine church_id based on table
  IF TG_TABLE_NAME = 'members' THEN
    v_church_id := COALESCE(NEW.church_id, OLD.church_id);
  ELSIF TG_TABLE_NAME = 'branches' THEN
    v_church_id := COALESCE(NEW.church_id, OLD.church_id);
  END IF;
  
  IF v_church_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get current totals
  SELECT COUNT(*) INTO v_current_members FROM members WHERE church_id = v_church_id;
  SELECT COUNT(*) INTO v_current_branches FROM branches WHERE church_id = v_church_id AND is_active = true;
  
  -- Update peaks only if in trial and not expired
  UPDATE subscriptions
  SET 
    trial_peak_total_members = GREATEST(trial_peak_total_members, v_current_members),
    trial_peak_total_branches = GREATEST(trial_peak_total_branches, v_current_branches),
    updated_at = now()
  WHERE church_id = v_church_id
    AND status = 'trialing'
    AND trial_end_at > now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to update peaks
CREATE TRIGGER update_trial_peaks_on_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_trial_peaks();

CREATE TRIGGER update_trial_peaks_on_branch_change
AFTER INSERT OR UPDATE OR DELETE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_trial_peaks();

-- Function to initialize subscription for a church
CREATE OR REPLACE FUNCTION public.initialize_church_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions (
    church_id,
    status,
    trial_start_at,
    trial_end_at,
    trial_peak_total_members,
    trial_peak_total_branches
  ) VALUES (
    NEW.id,
    'trialing',
    now(),
    now() + interval '14 days',
    0, -- Will be updated by peak trigger
    1  -- At least 1 branch (main branch)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to initialize subscription on church creation
CREATE TRIGGER initialize_subscription_on_church_create
AFTER INSERT ON public.churches
FOR EACH ROW
EXECUTE FUNCTION public.initialize_church_subscription();

-- Function to check and lock expired trials
CREATE OR REPLACE FUNCTION public.check_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscriptions
  SET 
    status = 'expired_locked',
    locked_at = now(),
    updated_at = now()
  WHERE status = 'trialing'
    AND trial_end_at <= now()
    AND paystack_subscription_code IS NULL;
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_church_id ON public.subscriptions(church_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscription_events_church_id ON public.subscription_events(church_id);
CREATE INDEX idx_subscription_events_event_id ON public.subscription_events(event_id);

-- Initialize subscriptions for existing churches (one-time migration)
INSERT INTO subscriptions (
  church_id,
  status,
  trial_start_at,
  trial_end_at,
  trial_peak_total_members,
  trial_peak_total_branches
)
SELECT 
  c.id,
  'trialing',
  now(),
  now() + interval '14 days',
  COALESCE((SELECT COUNT(*) FROM members WHERE church_id = c.id), 0),
  GREATEST(1, COALESCE((SELECT COUNT(*) FROM branches WHERE church_id = c.id AND is_active = true), 1))
FROM churches c
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.church_id = c.id
);