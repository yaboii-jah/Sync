-- The notifications table was created after the realtime publication was
-- set up, so it never got added — feeds subscribed to it silently received
-- nothing. Add it now.

alter publication supabase_realtime add table public.notifications;
