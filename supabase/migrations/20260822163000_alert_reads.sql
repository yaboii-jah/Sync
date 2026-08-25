-- Per-user "mark alerts as read" state. One row per attendee: opening the
-- Alerts feed stamps last_read_at, and the tab badge counts notifications
-- newer than that. Own-row RLS only.

create table public.alert_read_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now()
);

alter table public.alert_read_state enable row level security;

create policy "Users can view own alert read state"
  on public.alert_read_state for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own alert read state"
  on public.alert_read_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own alert read state"
  on public.alert_read_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
