-- Update the sequential member code function to properly isolate per church tenant
-- Each church will have its own sequence starting from 00001
CREATE OR REPLACE FUNCTION public.generate_sequential_member_code(_church_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  church_abbrev TEXT;
  max_seq INTEGER;
  new_seq INTEGER;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Get church abbreviation (first 2 letters of church name, uppercase)
  SELECT UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 1, 2))
  INTO church_abbrev
  FROM public.churches
  WHERE id = _church_id;
  
  IF church_abbrev IS NULL OR LENGTH(church_abbrev) < 2 THEN
    church_abbrev := 'CH';
  END IF;
  
  -- Find the maximum sequence number for THIS CHURCH's members only
  -- This ensures each church starts from 00001 independently
  SELECT COALESCE(MAX(
    CASE 
      WHEN member_code ~ ('^[A-Z]{2}-[0-9]{5}$') 
      THEN CAST(SUBSTRING(member_code FROM '[0-9]{5}$') AS INTEGER)
      ELSE 0
    END
  ), 0)
  INTO max_seq
  FROM public.members
  WHERE church_id = _church_id;
  
  -- Generate new sequential code
  new_seq := max_seq + 1;
  new_code := church_abbrev || '-' || LPAD(new_seq::TEXT, 5, '0');
  
  -- Verify uniqueness WITHIN THIS CHURCH ONLY (multi-tenant isolation)
  -- Different churches can have the same member code
  SELECT EXISTS(
    SELECT 1 FROM public.members 
    WHERE member_code = new_code 
    AND church_id = _church_id
  ) INTO code_exists;
  
  WHILE code_exists LOOP
    new_seq := new_seq + 1;
    new_code := church_abbrev || '-' || LPAD(new_seq::TEXT, 5, '0');
    SELECT EXISTS(
      SELECT 1 FROM public.members 
      WHERE member_code = new_code 
      AND church_id = _church_id
    ) INTO code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$function$;