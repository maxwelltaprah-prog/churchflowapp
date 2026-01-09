-- Add complementary SMS quota columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS complementary_sms_quota INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS complementary_sms_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS complementary_sms_cycle_start TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create a function to reset complementary SMS quota for eligible tiers
CREATE OR REPLACE FUNCTION public.reset_complementary_sms_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- Only reset for active subscriptions with Growth (299) or Enterprise (599) tier
  IF NEW.status = 'active' AND NEW.current_amount_ghs >= 299 THEN
    -- Check if cycle needs reset (30 days passed or first activation)
    IF NEW.complementary_sms_cycle_start IS NULL 
       OR (NOW() - NEW.complementary_sms_cycle_start) >= INTERVAL '30 days' THEN
      NEW.complementary_sms_quota := 900;
      NEW.complementary_sms_used := 0;
      NEW.complementary_sms_cycle_start := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to reset quota on subscription update
DROP TRIGGER IF EXISTS trigger_reset_complementary_sms ON public.subscriptions;
CREATE TRIGGER trigger_reset_complementary_sms
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_complementary_sms_quota();

-- Initialize quota for existing active subscriptions with Growth/Enterprise tier
UPDATE public.subscriptions 
SET 
  complementary_sms_quota = 900,
  complementary_sms_used = 0,
  complementary_sms_cycle_start = NOW()
WHERE status = 'active' 
  AND current_amount_ghs >= 299
  AND complementary_sms_cycle_start IS NULL;

-- Create a function to deduct complementary SMS
CREATE OR REPLACE FUNCTION public.deduct_complementary_sms(p_church_id UUID, p_count INTEGER)
RETURNS JSON AS $$
DECLARE
  v_subscription RECORD;
  v_remaining INTEGER;
BEGIN
  -- Get subscription with lock
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE church_id = p_church_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No subscription found');
  END IF;
  
  -- Check if eligible for complementary SMS (Growth or Enterprise tier)
  IF v_subscription.current_amount_ghs < 299 THEN
    RETURN json_build_object('success', false, 'error', 'Tier not eligible for complementary SMS', 'tier', 'starter');
  END IF;
  
  -- Check if cycle needs reset (30 days passed)
  IF v_subscription.complementary_sms_cycle_start IS NOT NULL 
     AND (NOW() - v_subscription.complementary_sms_cycle_start) >= INTERVAL '30 days' THEN
    -- Reset the cycle
    UPDATE public.subscriptions
    SET 
      complementary_sms_quota = 900,
      complementary_sms_used = 0,
      complementary_sms_cycle_start = NOW()
    WHERE church_id = p_church_id;
    
    v_subscription.complementary_sms_quota := 900;
    v_subscription.complementary_sms_used := 0;
  END IF;
  
  -- Calculate remaining
  v_remaining := v_subscription.complementary_sms_quota - v_subscription.complementary_sms_used;
  
  -- Check if enough credits
  IF v_remaining < p_count THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient complementary SMS credits',
      'remaining', v_remaining,
      'requested', p_count
    );
  END IF;
  
  -- Deduct the SMS count
  UPDATE public.subscriptions
  SET complementary_sms_used = complementary_sms_used + p_count
  WHERE church_id = p_church_id;
  
  RETURN json_build_object(
    'success', true,
    'deducted', p_count,
    'remaining', v_remaining - p_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to get complementary SMS status
CREATE OR REPLACE FUNCTION public.get_complementary_sms_status(p_church_id UUID)
RETURNS JSON AS $$
DECLARE
  v_subscription RECORD;
  v_remaining INTEGER;
  v_days_until_reset INTEGER;
  v_eligible BOOLEAN;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE church_id = p_church_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No subscription found');
  END IF;
  
  -- Check eligibility (Growth or Enterprise tier = 299+)
  v_eligible := v_subscription.status = 'active' AND v_subscription.current_amount_ghs >= 299;
  
  IF NOT v_eligible THEN
    RETURN json_build_object(
      'success', true,
      'eligible', false,
      'tier', CASE 
        WHEN v_subscription.current_amount_ghs < 150 THEN 'starter'
        ELSE 'starter'
      END,
      'remaining', 0,
      'quota', 0,
      'used', 0
    );
  END IF;
  
  -- Check if cycle needs reset
  IF v_subscription.complementary_sms_cycle_start IS NOT NULL 
     AND (NOW() - v_subscription.complementary_sms_cycle_start) >= INTERVAL '30 days' THEN
    -- Cycle expired, would reset on next activity
    v_remaining := 900;
    v_days_until_reset := 30;
  ELSE
    v_remaining := v_subscription.complementary_sms_quota - v_subscription.complementary_sms_used;
    IF v_subscription.complementary_sms_cycle_start IS NOT NULL THEN
      v_days_until_reset := GREATEST(0, 30 - EXTRACT(DAY FROM (NOW() - v_subscription.complementary_sms_cycle_start))::INTEGER);
    ELSE
      v_days_until_reset := 30;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'eligible', true,
    'tier', CASE 
      WHEN v_subscription.current_amount_ghs >= 599 THEN 'enterprise'
      ELSE 'growth'
    END,
    'remaining', v_remaining,
    'quota', v_subscription.complementary_sms_quota,
    'used', v_subscription.complementary_sms_used,
    'cycle_start', v_subscription.complementary_sms_cycle_start,
    'days_until_reset', v_days_until_reset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;