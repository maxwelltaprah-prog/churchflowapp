-- Create audit_logs table for tracking privileged actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Actor information (who performed the action)
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  actor_role text,
  
  -- Tenant context
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  
  -- Action details
  action text NOT NULL, -- e.g., 'role.create', 'permission.update', 'subscription.change'
  resource_type text NOT NULL, -- e.g., 'user_role', 'subscription', 'member'
  resource_id text, -- ID of the affected resource
  
  -- Additional context
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- For actions on other users
  metadata jsonb DEFAULT '{}'::jsonb, -- Additional structured data (sanitized)
  
  -- Outcome
  outcome text NOT NULL DEFAULT 'success', -- 'success', 'failure', 'denied'
  error_message text, -- Only for failures
  
  -- Request context
  ip_address text, -- Masked/hashed for privacy
  user_agent text
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_church_id ON public.audit_logs(church_id);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only church admins can view audit logs for their church
CREATE POLICY "Church admins can view their audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  church_id IN (
    SELECT ur.church_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'church_admin' 
    AND ur.is_active = true
  )
);

-- No direct insert/update/delete from client - only via service role
-- Audit logs are immutable once created

-- Create alert_events table for security monitoring
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Alert classification
  alert_type text NOT NULL, -- 'rate_limit_triggered', 'auth_failure_spike', 'permission_denied_spike'
  severity text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Context
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE,
  actor_id uuid,
  ip_address text, -- Masked
  
  -- Details
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Resolution
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz
);

-- Create indexes
CREATE INDEX idx_security_alerts_church_id ON public.security_alerts(church_id);
CREATE INDEX idx_security_alerts_alert_type ON public.security_alerts(alert_type);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);

-- Enable RLS
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Only church admins can view security alerts for their church
CREATE POLICY "Church admins can view their security alerts"
ON public.security_alerts
FOR SELECT
TO authenticated
USING (
  church_id IN (
    SELECT ur.church_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'church_admin' 
    AND ur.is_active = true
  )
);

-- Church admins can acknowledge alerts
CREATE POLICY "Church admins can update their security alerts"
ON public.security_alerts
FOR UPDATE
TO authenticated
USING (
  church_id IN (
    SELECT ur.church_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'church_admin' 
    AND ur.is_active = true
  )
)
WITH CHECK (
  church_id IN (
    SELECT ur.church_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'church_admin' 
    AND ur.is_active = true
  )
);