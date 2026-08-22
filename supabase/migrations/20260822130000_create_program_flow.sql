-- Program flow tables: events, sessions, speakers/sponsors, session
-- links, and attendee bookmarks (My Flow).
-- Content is managed directly in the database (no admin app);
-- attendees get read-only access; bookmark writes are own-row only.
-- Session/event status is auto-flipped by pg_cron (see bottom).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'started', 'ended')),
  constraint events_time_range check (ends_at > starts_at)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  description text,
  room text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'ongoing', 'finished')),
  constraint sessions_time_range check (end_time > start_time)
);

create index sessions_event_id_idx on public.sessions (event_id);
create index sessions_start_time_idx on public.sessions (start_time);

create table public.speakers_sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  role text not null
    check (role in ('speaker', 'host', 'panelist', 'sponsor')),
  organization text,
  bio text,
  linkedin_url text
);

create table public.session_speakers (
  session_id uuid not null references public.sessions (id) on delete cascade,
  speaker_id uuid not null
    references public.speakers_sponsors (id) on delete cascade,
  primary key (session_id, speaker_id)
);

create table public.my_flow_bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index my_flow_bookmarks_session_id_idx
  on public.my_flow_bookmarks (session_id);

alter table public.events enable row level security;
alter table public.sessions enable row level security;
alter table public.speakers_sponsors enable row level security;
alter table public.session_speakers enable row level security;
alter table public.my_flow_bookmarks enable row level security;

create policy "Authenticated users can view events"
  on public.events for select to authenticated using (true);

create policy "Authenticated users can view sessions"
  on public.sessions for select to authenticated using (true);

create policy "Authenticated users can view speakers/sponsors"
  on public.speakers_sponsors for select to authenticated using (true);

create policy "Authenticated users can view session-speaker links"
  on public.session_speakers for select to authenticated using (true);

create policy "Users can view own bookmarks"
  on public.my_flow_bookmarks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own bookmarks"
  on public.my_flow_bookmarks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own bookmarks"
  on public.my_flow_bookmarks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Status auto-flip: derives from schedule times so no manual posting is
-- ever needed, while producing real DB changes that Realtime/push react to.
create extension if not exists pg_cron;

create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
as $$
begin
  update public.events
     set status = calc.new_status
    from (
      select id,
             case
               when now() < starts_at then 'upcoming'
               when now() > ends_at then 'ended'
               else 'started'
             end as new_status
        from public.events
    ) calc
   where public.events.id = calc.id
     and public.events.status is distinct from calc.new_status;

  update public.sessions
     set status = calc.new_status
    from (
      select id,
             case
               when now() < start_time then 'not_started'
               when now() > end_time then 'finished'
               else 'ongoing'
             end as new_status
        from public.sessions
    ) calc
   where public.sessions.id = calc.id
     and public.sessions.status is distinct from calc.new_status;
end;
$$;

select cron.schedule(
  'sync-program-flow-statuses',
  '* * * * *',
  $$select public.sync_program_flow_statuses()$$
);
