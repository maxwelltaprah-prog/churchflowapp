-- Enable realtime for attendance table
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;