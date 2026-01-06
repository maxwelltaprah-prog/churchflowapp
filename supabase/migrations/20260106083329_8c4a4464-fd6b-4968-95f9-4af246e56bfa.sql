-- Add gender and date_of_birth columns to visitors table
ALTER TABLE public.visitors
ADD COLUMN gender gender_type,
ADD COLUMN date_of_birth DATE;