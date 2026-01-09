-- Update the get_complementary_sms_status function to include Starter tier with 100 SMS
CREATE OR REPLACE FUNCTION public.get_complementary_sms_status(p_church_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_tier TEXT;
  v_quota INTEGER;
  v_days_until_reset INTEGER;
  v_cycle_end TIMESTAMPTZ;
BEGIN
  -- Get subscription details
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE church_id = p_church_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'No subscription found'
    );
  END IF;
  
  -- Check if subscription is active
  IF v_subscription.status NOT IN ('active', 'trialing') THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'Subscription not active'
    );
  END IF;
  
  -- Determine tier and quota based on current_amount_ghs
  -- Starter: 99 GHS = 100 SMS
  -- Growth: 299 GHS = 900 SMS
  -- Enterprise: 599 GHS = 900 SMS
  IF v_subscription.current_amount_ghs >= 599 THEN
    v_tier := 'enterprise';
    v_quota := 900;
  ELSIF v_subscription.current_amount_ghs >= 299 THEN
    v_tier := 'growth';
    v_quota := 900;
  ELSIF v_subscription.current_amount_ghs >= 99 OR v_subscription.status = 'trialing' THEN
    v_tier := 'starter';
    v_quota := 100;
  ELSE
    RETURN json_build_object(
      'eligible', false,
      'reason', 'Tier not eligible for complementary SMS'
    );
  END IF;
  
  -- Calculate days until reset (30-day cycle)
  v_cycle_end := COALESCE(v_subscription.complementary_sms_cycle_start, v_subscription.created_at) + INTERVAL '30 days';
  v_days_until_reset := GREATEST(0, EXTRACT(DAY FROM v_cycle_end - NOW())::INTEGER);
  
  -- Check if cycle needs reset
  IF NOW() >= v_cycle_end THEN
    -- Cycle has expired, will be reset on next deduction
    v_days_until_reset := 30;
  END IF;
  
  RETURN json_build_object(
    'eligible', true,
    'tier', v_tier,
    'quota', v_quota,
    'used', v_subscription.complementary_sms_used,
    'remaining', GREATEST(0, v_quota - v_subscription.complementary_sms_used),
    'days_until_reset', v_days_until_reset,
    'cycle_start', v_subscription.complementary_sms_cycle_start
  );
END;
$$;

-- Update the deduct_complementary_sms function to handle Starter tier
CREATE OR REPLACE FUNCTION public.deduct_complementary_sms(p_church_id UUID, p_count INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_tier TEXT;
  v_quota INTEGER;
  v_new_used INTEGER;
  v_remaining INTEGER;
  v_cycle_end TIMESTAMPTZ;
BEGIN
  -- Get subscription with lock
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE church_id = p_church_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No subscription found');
  END IF;
  
  -- Check if subscription is active
  IF v_subscription.status NOT IN ('active', 'trialing') THEN
    RETURN json_build_object('success', false, 'error', 'Subscription not active');
  END IF;
  
  -- Determine tier and quota
  IF v_subscription.current_amount_ghs >= 599 THEN
    v_tier := 'enterprise';
    v_quota := 900;
  ELSIF v_subscription.current_amount_ghs >= 299 THEN
    v_tier := 'growth';
    v_quota := 900;
  ELSIF v_subscription.current_amount_ghs >= 99 OR v_subscription.status = 'trialing' THEN
    v_tier := 'starter';
    v_quota := 100;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Tier not eligible');
  END IF;
  
  -- Check if cycle needs reset (30-day period)
  v_cycle_end := COALESCE(v_subscription.complementary_sms_cycle_start, v_subscription.created_at) + INTERVAL '30 days';
  
  IF NOW() >= v_cycle_end THEN
    -- Reset the cycle
    UPDATE subscriptions
    SET 
      complementary_sms_used = p_count,
      complementary_sms_quota = v_quota,
      complementary_sms_cycle_start = NOW(),
      updated_at = NOW()
    WHERE church_id = p_church_id;
    
    v_remaining := v_quota - p_count;
  ELSE
    -- Check if we have enough remaining
    v_remaining := v_quota - v_subscription.complementary_sms_used;
    
    IF p_count > v_remaining THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Insufficient complementary SMS credits',
        'remaining', v_remaining
      );
    END IF;
    
    -- Deduct from current cycle
    v_new_used := v_subscription.complementary_sms_used + p_count;
    
    UPDATE subscriptions
    SET 
      complementary_sms_used = v_new_used,
      updated_at = NOW()
    WHERE church_id = p_church_id;
    
    v_remaining := v_quota - v_new_used;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'deducted', p_count,
    'remaining', v_remaining,
    'tier', v_tier
  );
END;
$$;