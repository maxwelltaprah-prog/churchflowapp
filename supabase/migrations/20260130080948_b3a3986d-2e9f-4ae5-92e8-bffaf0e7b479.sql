-- Create payment method enum for tithe payments
CREATE TYPE public.tithe_payment_method AS ENUM ('cash', 'momo', 'bank', 'card', 'other');

-- Create tithe payment status enum
CREATE TYPE public.tithe_payment_status AS ENUM ('paid', 'reversed', 'pending');

-- Create tithe_payments table
CREATE TABLE public.tithe_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2000 AND period_year <= 2100),
  payment_method public.tithe_payment_method NOT NULL DEFAULT 'cash',
  reference_note TEXT,
  recorded_by_user_id UUID REFERENCES auth.users(id),
  status public.tithe_payment_status NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tithe_settings table
CREATE TABLE public.tithe_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE UNIQUE,
  tithe_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  enable_pledge_targets BOOLEAN NOT NULL DEFAULT false,
  enable_reminders BOOLEAN NOT NULL DEFAULT false,
  default_currency TEXT NOT NULL DEFAULT 'GHS',
  privacy_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.tithe_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tithe_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_tithe_payments_church_id ON public.tithe_payments(church_id);
CREATE INDEX idx_tithe_payments_member_id ON public.tithe_payments(member_id);
CREATE INDEX idx_tithe_payments_period ON public.tithe_payments(period_year, period_month);
CREATE INDEX idx_tithe_payments_payment_date ON public.tithe_payments(payment_date);
CREATE INDEX idx_tithe_payments_status ON public.tithe_payments(status);

-- RLS Policies for tithe_payments

-- Staff can view tithe payments in their church
CREATE POLICY "Staff can view tithe payments in their church"
ON public.tithe_payments
FOR SELECT
USING (church_id = get_user_church_id(auth.uid()));

-- Church admins can insert tithe payments
CREATE POLICY "Church admins can insert tithe payments"
ON public.tithe_payments
FOR INSERT
WITH CHECK (is_church_admin(auth.uid(), church_id));

-- Church admins can update tithe payments
CREATE POLICY "Church admins can update tithe payments"
ON public.tithe_payments
FOR UPDATE
USING (is_church_admin(auth.uid(), church_id));

-- Church admins can delete tithe payments
CREATE POLICY "Church admins can delete tithe payments"
ON public.tithe_payments
FOR DELETE
USING (is_church_admin(auth.uid(), church_id));

-- RLS Policies for tithe_settings

-- Church admins can view their tithe settings
CREATE POLICY "Church admins can view tithe settings"
ON public.tithe_settings
FOR SELECT
USING (is_church_admin(auth.uid(), church_id));

-- Church admins can insert tithe settings
CREATE POLICY "Church admins can insert tithe settings"
ON public.tithe_settings
FOR INSERT
WITH CHECK (is_church_admin(auth.uid(), church_id));

-- Church admins can update tithe settings
CREATE POLICY "Church admins can update tithe settings"
ON public.tithe_settings
FOR UPDATE
USING (is_church_admin(auth.uid(), church_id));

-- Create trigger for updated_at on tithe_payments
CREATE TRIGGER update_tithe_payments_updated_at
BEFORE UPDATE ON public.tithe_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on tithe_settings
CREATE TRIGGER update_tithe_settings_updated_at
BEFORE UPDATE ON public.tithe_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();