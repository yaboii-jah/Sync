-- Push pipeline storage + automation:
-- 1. notifications: automatic session-live/session-ended records (feeds the
--    future Alerts tab; every INSERT also fires the send-push webhook).
-- 2. push_subscriptions: one row per attendee device endpoint.
-- 3. The pg_cron minute-job is extended to write a notification whenever a
--    session status actually flips.
-- 4. pg_net webhook forwards each new notification to the send-push
--    Edge Function. Shared secret lives in private.app_secrets.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('session_live', 'session_ended')),
  title text not null,
  body text,
  related_session_id uuid references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index notifications_created_at_idx
  on public.notifications (created_at desc);
create index notifications_related_session_id_idx
  on public.notifications (related_session_id);

alter table public.notifications enable row level security;

create policy "Authenticated users can view notifications"
  on public.notifications for select to authenticated using (true);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can register own push subscription"
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own push subscription"
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove own push subscription"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Extended minute-job: flips statuses and writes a notification per flip.
create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
as $$
declare
  flipped record;
begin
  for flipped in
    select s.id,
           s.title,
           s.room,
           case
             when now() < s.start_time then 'not_started'
             when now() > s.end_time then 'finished'
             else 'ongoing'
           end as new_status
      from public.sessions s
     where s.status is distinct from (
       case
         when now() < s.start_time then 'not_started'
         when now() > s.end_time then 'finished'
         else 'ongoing'
       end
     )
  loop
    update public.sessions
       set status = flipped.new_status
     where id = flipped.id;

    if flipped.new_status = 'ongoing' then
      insert into public.notifications (type, title, body, related_session_id)
      values (
        'session_live',
        flipped.title || ' is live',
        'Head over to ' || coalesce(flipped.room, 'the venue') || '.',
        flipped.id
      );
    elsif flipped.new_status = 'finished' then
      insert into public.notifications (type, title, body, related_session_id)
      values ('session_ended', flipped.title || ' just wrapped up', null, flipped.id);
    end if;
  end loop;

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
end;
$$;

create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null
);

insert into private.app_secrets (name, value)
values ('push_webhook_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

create or replace function public.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
begin
  select value into webhook_secret
    from private.app_secrets
   where name = 'push_webhook_secret';

  perform net.http_post(
    url := 'https://mygybolhwoeckrgczclm.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'id', new.id,
      'type', new.type,
      'title', new.title,
      'body', new.body
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

create trigger notifications_push_webhook
  after insert on public.notifications
  for each row execute function public.notify_push_webhook();
