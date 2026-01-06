-- Add unique constraint to prevent duplicate visitor check-ins for the same service
ALTER TABLE public.visitor_checkins
ADD CONSTRAINT unique_visitor_service_checkin UNIQUE (visitor_id, service_id);