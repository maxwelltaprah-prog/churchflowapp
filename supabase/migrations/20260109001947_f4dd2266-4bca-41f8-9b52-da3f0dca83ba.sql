-- Create enum type for days of the week
CREATE TYPE public.day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- Add day_born column to members table
ALTER TABLE public.members 
ADD COLUMN day_born public.day_of_week;

-- Add day_born column to visitors table
ALTER TABLE public.visitors 
ADD COLUMN day_born public.day_of_week;