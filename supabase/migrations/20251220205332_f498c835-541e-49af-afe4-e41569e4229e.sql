-- Fix search_path warnings for helper functions

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_member_code(_church_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(_church_slug) || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.members WHERE member_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_branch_code(_church_slug TEXT, _branch_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  branch_prefix TEXT;
BEGIN
  branch_prefix := UPPER(LEFT(REGEXP_REPLACE(_branch_name, '[^a-zA-Z]', '', 'g'), 3));
  LOOP
    new_code := UPPER(_church_slug) || '-' || branch_prefix || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    SELECT EXISTS(SELECT 1 FROM public.branches WHERE join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;