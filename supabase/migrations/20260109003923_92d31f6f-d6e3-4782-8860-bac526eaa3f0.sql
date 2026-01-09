-- Function to calculate day_born from date_of_birth
CREATE OR REPLACE FUNCTION public.calculate_day_born(dob date)
RETURNS public.day_of_week
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF dob IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- EXTRACT(DOW FROM date) returns 0=Sunday, 1=Monday, ..., 6=Saturday
  RETURN CASE EXTRACT(DOW FROM dob)
    WHEN 0 THEN 'sunday'::public.day_of_week
    WHEN 1 THEN 'monday'::public.day_of_week
    WHEN 2 THEN 'tuesday'::public.day_of_week
    WHEN 3 THEN 'wednesday'::public.day_of_week
    WHEN 4 THEN 'thursday'::public.day_of_week
    WHEN 5 THEN 'friday'::public.day_of_week
    WHEN 6 THEN 'saturday'::public.day_of_week
  END;
END;
$$;

-- Trigger function to auto-set day_born on insert/update
CREATE OR REPLACE FUNCTION public.auto_set_day_born()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only auto-calculate if date_of_birth is set and day_born is NULL
  -- This allows manual override of day_born
  IF NEW.date_of_birth IS NOT NULL AND NEW.day_born IS NULL THEN
    NEW.day_born := public.calculate_day_born(NEW.date_of_birth);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on members table
DROP TRIGGER IF EXISTS trigger_auto_set_day_born ON public.members;
CREATE TRIGGER trigger_auto_set_day_born
  BEFORE INSERT OR UPDATE OF date_of_birth
  ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_day_born();

-- Update existing members who have date_of_birth but no day_born
UPDATE public.members
SET day_born = public.calculate_day_born(date_of_birth)
WHERE date_of_birth IS NOT NULL
  AND day_born IS NULL;