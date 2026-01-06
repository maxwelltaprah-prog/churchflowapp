-- Create a function to generate sequential member codes
-- Format: First 2 letters of church name + hyphen + 5-digit sequential number (e.g., GC-00001)

CREATE OR REPLACE FUNCTION public.generate_sequential_member_code(_church_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
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
  
  -- Find the maximum sequence number for this church's members
  -- Extract numeric part from existing codes that match our format
  SELECT COALESCE(MAX(
    CASE 
      WHEN member_code ~ ('^' || church_abbrev || '-[0-9]{5}$') 
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
  
  -- Verify uniqueness (edge case protection)
  SELECT EXISTS(SELECT 1 FROM public.members WHERE member_code = new_code) INTO code_exists;
  
  WHILE code_exists LOOP
    new_seq := new_seq + 1;
    new_code := church_abbrev || '-' || LPAD(new_seq::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.members WHERE member_code = new_code) INTO code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update all existing members to use the new sequential code format
-- Order by date_joined (or created_at as fallback) to assign codes based on join order
DO $$
DECLARE
  member_rec RECORD;
  church_abbrev TEXT;
  seq_counter INTEGER;
  new_code TEXT;
  current_church_id UUID := NULL;
BEGIN
  -- Process members ordered by church and join date
  FOR member_rec IN 
    SELECT m.id, m.church_id, m.date_joined, m.created_at
    FROM public.members m
    ORDER BY m.church_id, COALESCE(m.date_joined, m.created_at::date), m.created_at
  LOOP
    -- Reset counter when church changes
    IF current_church_id IS DISTINCT FROM member_rec.church_id THEN
      current_church_id := member_rec.church_id;
      seq_counter := 0;
      
      -- Get church abbreviation
      SELECT UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 1, 2))
      INTO church_abbrev
      FROM public.churches
      WHERE id = current_church_id;
      
      IF church_abbrev IS NULL OR LENGTH(church_abbrev) < 2 THEN
        church_abbrev := 'CH';
      END IF;
    END IF;
    
    -- Increment and assign
    seq_counter := seq_counter + 1;
    new_code := church_abbrev || '-' || LPAD(seq_counter::TEXT, 5, '0');
    
    -- Update the member
    UPDATE public.members
    SET member_code = new_code
    WHERE id = member_rec.id;
  END LOOP;
END;
$$;