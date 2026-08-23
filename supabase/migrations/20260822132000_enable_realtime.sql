-- Broadcast Postgres changes for the program flow so connected clients
-- update live. Realtime enforces each subscriber's RLS against their JWT,
-- so attendees only ever receive bookmark events for their own rows.

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.my_flow_bookmarks;
alter publication supabase_realtime add table public.events;
