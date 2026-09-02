-- Protected event operations: admin allowlist, recipient-scoped alerts,
-- durable push results, manual session overrides, and mutation auditing.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid
);

alter table public.admin_users enable row level security;

create policy "Admins can view own allowlist entry"
  on public.admin_users for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admin_users
     where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Keep pass type dormant and system-owned while retaining the existing column.
create or replace function public.protect_managed_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.pass_type is distinct from old.pass_type
     and not (select private.is_admin()) then
    raise exception 'pass type is not attendee-editable';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_managed_fields
  before update on public.profiles
  for each row execute function public.protect_managed_profile_fields();

revoke insert on public.profiles from authenticated;
grant insert (id, name, photo_url, linkedin_url) on public.profiles to authenticated;

alter table public.sessions
  add column status_override text
    check (status_override in ('ongoing', 'finished')),
  add column status_override_at timestamptz,
  add column status_override_by uuid references auth.users (id) on delete set null,
  add column actual_started_at timestamptz,
  add column actual_ended_at timestamptz;

drop policy "Users can create own bookmarks" on public.my_flow_bookmarks;
create policy "Users can create own unfinished bookmarks"
  on public.my_flow_bookmarks for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
        from public.sessions
       where sessions.id = session_id
         and case
           when sessions.status_override is not null
             then sessions.status_override <> 'finished'
           else now() < sessions.end_time
         end
    )
  );

alter table public.notifications
  add column source text not null default 'automatic'
    check (source in ('automatic', 'admin', 'manual_status')),
  add column created_by uuid references auth.users (id) on delete set null,
  add column audience_kind text not null default 'all'
    check (audience_kind in ('all', 'selected', 'bookmarkers')),
  add column audience_summary jsonb not null default '{}'::jsonb,
  add column request_id uuid,
  add column dedupe_key text;

create unique index notifications_request_id_idx
  on public.notifications (request_id) where request_id is not null;
create unique index notifications_dedupe_key_idx
  on public.notifications (dedupe_key) where dedupe_key is not null;

create table public.notification_recipients (
  notification_id uuid not null
    references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index notification_recipients_user_created_idx
  on public.notification_recipients (user_id, created_at desc);

create table public.notification_dispatches (
  notification_id uuid primary key
    references public.notifications (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  recipient_count integer not null default 0,
  target_device_count integer not null default 0,
  accepted_count integer not null default 0,
  failed_count integer not null default 0,
  pruned_count integer not null default 0,
  no_subscription_count integer not null default 0,
  attempt_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index notification_dispatches_status_created_idx
  on public.notification_dispatches (status, created_at desc);

create table public.notification_deliveries (
  id bigint generated always as identity primary key,
  notification_id uuid not null
    references public.notifications (id) on delete cascade,
  user_id uuid not null,
  subscription_id uuid not null,
  device_id text not null,
  status text not null check (status in ('accepted', 'failed', 'pruned')),
  status_code integer,
  error text,
  attempted_at timestamptz not null default now(),
  unique (notification_id, subscription_id)
);

create index notification_deliveries_notification_status_idx
  on public.notification_deliveries (notification_id, status);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create or replace function public.prevent_admin_audit_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'admin audit entries are immutable';
end;
$$;

create trigger admin_audit_log_immutable
  before update or delete on public.admin_audit_log
  for each row execute function public.prevent_admin_audit_changes();

alter table public.notification_recipients enable row level security;
alter table public.notification_dispatches enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "Users can view own notification recipients"
  on public.notification_recipients for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "Admins can view notification dispatches"
  on public.notification_dispatches for select to authenticated
  using ((select private.is_admin()));

create policy "Admins can view notification deliveries"
  on public.notification_deliveries for select to authenticated
  using ((select private.is_admin()));

create policy "Admins can view audit history"
  on public.admin_audit_log for select to authenticated
  using ((select private.is_admin()));

create policy "Admins can view attendee profiles"
  on public.profiles for select to authenticated
  using ((select private.is_admin()));

-- Preserve the historical feed visibility before switching to recipient RLS.
insert into public.notification_recipients (notification_id, user_id)
select notifications.id, profiles.id
  from public.notifications as notifications
 cross join public.profiles as profiles
on conflict do nothing;

update public.notifications
   set audience_kind = 'all',
       audience_summary = jsonb_build_object('legacy', true);

insert into public.notification_dispatches (
  notification_id,
  status,
  recipient_count,
  completed_at
)
select notifications.id,
       'completed',
       (select count(*)::integer
          from public.notification_recipients as recipients
         where recipients.notification_id = notifications.id),
       notifications.created_at
  from public.notifications as notifications
on conflict do nothing;

drop policy "Authenticated users can view notifications"
  on public.notifications;

create policy "Recipients and admins can view notifications"
  on public.notifications for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1
        from public.notification_recipients as recipients
       where recipients.notification_id = notifications.id
         and recipients.user_id = (select auth.uid())
    )
  );

create or replace function private.create_notification(
  notification_type text,
  notification_title text,
  notification_body text,
  related_session uuid,
  notification_source text,
  audience text,
  actor_id uuid default null,
  mutation_request_id uuid default null,
  notification_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  insert into public.notifications (
    type,
    title,
    body,
    related_session_id,
    source,
    created_by,
    audience_kind,
    audience_summary,
    request_id,
    dedupe_key
  )
  values (
    notification_type,
    notification_title,
    notification_body,
    related_session,
    notification_source,
    actor_id,
    audience,
    jsonb_build_object('kind', audience),
    mutation_request_id,
    notification_dedupe_key
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into created_id;

  if created_id is null and notification_dedupe_key is not null then
    select id into created_id
      from public.notifications
     where dedupe_key = notification_dedupe_key;
    return created_id;
  end if;

  if audience = 'all' then
    insert into public.notification_recipients (notification_id, user_id)
    select created_id, id from public.profiles
    on conflict do nothing;
  elsif audience = 'bookmarkers' then
    insert into public.notification_recipients (notification_id, user_id)
    select created_id, user_id
      from public.my_flow_bookmarks
     where session_id = related_session
    on conflict do nothing;
  else
    raise exception 'unsupported internal audience';
  end if;

  return created_id;
end;
$$;

revoke all on function private.create_notification(
  text, text, text, uuid, text, text, uuid, uuid, text
) from public;

create or replace function private.enqueue_push(notification_id uuid)
returns void
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
    body := jsonb_build_object('id', notification_id),
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function private.enqueue_push(uuid) from public;

create or replace function public.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_dispatches (notification_id)
  values (new.id)
  on conflict do nothing;

  perform private.enqueue_push(new.id);

  return new;
end;
$$;

create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
as $$
declare
  flipped record;
  reminder record;
begin
  for flipped in
    select sessions.id,
           sessions.title,
           sessions.room,
           case
             when now() < sessions.start_time then 'not_started'
             when now() >= sessions.end_time then 'finished'
             else 'ongoing'
           end as new_status
      from public.sessions as sessions
     where sessions.status_override is null
       and sessions.status is distinct from (
         case
           when now() < sessions.start_time then 'not_started'
           when now() >= sessions.end_time then 'finished'
           else 'ongoing'
         end
       )
     for update skip locked
  loop
    update public.sessions
       set status = flipped.new_status
     where id = flipped.id;

    if flipped.new_status = 'ongoing' then
      perform private.create_notification(
        'session_live',
        flipped.title || ' is live',
        'Head over to ' || coalesce(flipped.room, 'the venue') || '.',
        flipped.id,
        'automatic',
        'bookmarkers',
        null,
        null,
        'session:' || flipped.id || ':live'
      );
    elsif flipped.new_status = 'finished' then
      perform private.create_notification(
        'session_ended',
        flipped.title || ' just wrapped up',
        null,
        flipped.id,
        'automatic',
        'bookmarkers',
        null,
        null,
        'session:' || flipped.id || ':ended'
      );

      delete from public.my_flow_bookmarks
       where session_id = flipped.id;
    end if;
  end loop;

  for reminder in
    select sessions.id, sessions.title, sessions.room
      from public.sessions as sessions
     where sessions.status_override is null
       and sessions.status = 'not_started'
       and sessions.reminder_sent_at is null
       and sessions.start_time between now() + interval '9 minutes'
                                   and now() + interval '11 minutes'
     for update skip locked
  loop
    update public.sessions
       set reminder_sent_at = now()
     where id = reminder.id;

    perform private.create_notification(
      'session_reminder',
      reminder.title || ' starts in 10 minutes',
      'Head over to ' || coalesce(reminder.room, 'the venue') || '.',
      reminder.id,
      'automatic',
      'bookmarkers',
      null,
      null,
      'session:' || reminder.id || ':reminder'
    );
  end loop;

  update public.events
     set status = calculated.new_status
    from (
      select id,
             case
               when now() < starts_at then 'upcoming'
               when now() >= ends_at then 'ended'
               else 'started'
             end as new_status
        from public.events
    ) as calculated
   where public.events.id = calculated.id
     and public.events.status is distinct from calculated.new_status;
end;
$$;

create or replace function public.retry_push_dispatches()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  retry record;
begin
  update public.notification_dispatches
     set status = 'failed',
         completed_at = now(),
         last_error = 'Dispatch retry limit exhausted'
   where attempt_count >= 3
     and (
       (status = 'running' and started_at < now() - interval '5 minutes')
       or (status = 'pending' and created_at < now() - interval '2 minutes')
     );

  for retry in
    select notification_id
      from public.notification_dispatches
     where attempt_count < 3
       and (
         status = 'failed'
         or (status = 'running' and started_at < now() - interval '5 minutes')
         or (status = 'pending' and created_at < now() - interval '2 minutes')
       )
     for update skip locked
  loop
    update public.notification_dispatches
       set status = 'pending',
           started_at = null,
           completed_at = null
     where notification_id = retry.notification_id;
    perform private.enqueue_push(retry.notification_id);
  end loop;
end;
$$;

revoke all on function public.retry_push_dispatches() from public;

select cron.schedule(
  'retry-push-dispatches',
  '* * * * *',
  $$select public.retry_push_dispatches()$$
);

create or replace function public.admin_create_notification(
  notification_title text,
  notification_body text,
  audience text,
  recipient_ids uuid[],
  mutation_request_id uuid
)
returns table (
  notification_id uuid,
  recipient_count bigint,
  device_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  created_id uuid;
begin
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  if char_length(trim(notification_title)) not between 1 and 80 then
    raise exception 'title must be between 1 and 80 characters';
  end if;

  if char_length(coalesce(notification_body, '')) > 240 then
    raise exception 'body must be at most 240 characters';
  end if;

  select notifications.id into created_id
    from public.notifications as notifications
   where notifications.request_id = mutation_request_id;

  if created_id is null then
    if exists (
      select 1 from public.admin_audit_log
       where request_id = mutation_request_id
    ) then
      raise exception 'request id was already used for another mutation';
    end if;

    if audience not in ('all', 'selected') then
      raise exception 'invalid audience';
    end if;

    insert into public.notifications (
      type,
      title,
      body,
      source,
      created_by,
      audience_kind,
      audience_summary,
      request_id
    )
    values (
      'announcement',
      trim(notification_title),
      nullif(trim(coalesce(notification_body, '')), ''),
      'admin',
      actor,
      audience,
      case
        when audience = 'all' then jsonb_build_object('kind', 'all')
        else jsonb_build_object(
          'kind', 'selected',
          'requested', coalesce(cardinality(recipient_ids), 0)
        )
      end,
      mutation_request_id
    )
    returning id into created_id;

    if audience = 'all' then
      insert into public.notification_recipients (notification_id, user_id)
      select created_id, id from public.profiles;
    else
      insert into public.notification_recipients (notification_id, user_id)
      select created_id, profiles.id
        from public.profiles as profiles
       where profiles.id = any(coalesce(recipient_ids, array[]::uuid[]));

      if not found then
        raise exception 'select at least one valid attendee';
      end if;
    end if;

    insert into public.admin_audit_log (
      actor_id,
      action,
      entity_type,
      entity_id,
      details,
      request_id
    )
    values (
      actor,
      'notification.sent',
      'notification',
      created_id,
      jsonb_build_object('audience', audience, 'title', trim(notification_title)),
      mutation_request_id
    );
  end if;

  return query
  select created_id,
         count(distinct recipients.user_id),
         count(distinct subscriptions.id)
    from public.notification_recipients as recipients
    left join public.push_subscriptions as subscriptions
      on subscriptions.user_id = recipients.user_id
   where recipients.notification_id = created_id;
end;
$$;

create or replace function public.admin_set_session_status(
  target_session_id uuid,
  action text,
  send_notification boolean,
  mutation_request_id uuid
)
returns table (
  session_id uuid,
  status text,
  status_override text,
  status_override_at timestamptz,
  actual_started_at timestamptz,
  actual_ended_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  current_session public.sessions%rowtype;
  next_status text;
  notification_id uuid;
begin
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  if exists (
    select 1
      from public.admin_audit_log as audit
     where audit.request_id = mutation_request_id
       and audit.action = 'session.' || $2
       and audit.entity_id = target_session_id
  ) then
    return query
    select sessions.id,
           sessions.status,
           sessions.status_override,
           sessions.status_override_at,
           sessions.actual_started_at,
           sessions.actual_ended_at
      from public.sessions as sessions
     where sessions.id = target_session_id;
    return;
  end if;

  if exists (
    select 1 from public.admin_audit_log
     where request_id = mutation_request_id
  ) then
    raise exception 'request id was already used for another mutation';
  end if;

  select * into current_session
    from public.sessions
   where id = target_session_id
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  if action = 'start' then
    if current_session.status = 'ongoing' then
      raise exception 'session is already ongoing';
    end if;
    if current_session.status = 'finished' then
      raise exception 'finished sessions cannot be restarted';
    end if;

    update public.sessions
       set status = 'ongoing',
           status_override = 'ongoing',
           status_override_at = now(),
           status_override_by = actor,
           actual_started_at = now(),
           actual_ended_at = null
     where id = target_session_id;
    next_status := 'ongoing';

    if send_notification then
      notification_id := private.create_notification(
        'session_live',
        current_session.title || ' is live',
        'Head over to ' || coalesce(current_session.room, 'the venue') || '.',
        target_session_id,
        'manual_status',
        'all',
        actor,
        null,
        'manual:' || mutation_request_id
      );
    end if;
  elsif action = 'end' then
    if current_session.status = 'finished' then
      raise exception 'session is already finished';
    end if;
    update public.sessions
       set status = 'finished',
           status_override = 'finished',
           status_override_at = now(),
           status_override_by = actor,
           actual_ended_at = now()
     where id = target_session_id;
    next_status := 'finished';

    if send_notification then
      notification_id := private.create_notification(
        'session_ended',
        current_session.title || ' just wrapped up',
        null,
        target_session_id,
        'manual_status',
        'all',
        actor,
        null,
        'manual:' || mutation_request_id
      );
    end if;

    delete from public.my_flow_bookmarks as bookmarks
     where bookmarks.session_id = target_session_id;
  elsif action = 'resume_auto' then
    if current_session.status_override is null then
      raise exception 'session is already using automatic status';
    end if;

    next_status := case
      when now() < current_session.start_time then 'not_started'
      when now() >= current_session.end_time then 'finished'
      else 'ongoing'
    end;

    update public.sessions
       set status = next_status,
           status_override = null,
           status_override_at = null,
           status_override_by = null
     where id = target_session_id;
  else
    raise exception 'invalid session action';
  end if;

  insert into public.admin_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    request_id
  )
  values (
    actor,
    'session.' || action,
    'session',
    target_session_id,
    jsonb_build_object(
      'before_status', current_session.status,
      'before_override', current_session.status_override,
      'after_status', next_status,
      'notification_id', notification_id
    ),
    mutation_request_id
  );

  return query
  select sessions.id,
         sessions.status,
         sessions.status_override,
         sessions.status_override_at,
         sessions.actual_started_at,
         sessions.actual_ended_at
    from public.sessions as sessions
   where sessions.id = target_session_id;
end;
$$;

create or replace function public.admin_search_attendees(
  search_query text default '',
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  id uuid,
  name text,
  photo_url text,
  linkedin_url text,
  created_at timestamptz,
  push_device_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  return query
  select profiles.id,
         profiles.name,
         profiles.photo_url,
         profiles.linkedin_url,
         profiles.created_at,
         count(subscriptions.id)
    from public.profiles as profiles
    left join public.push_subscriptions as subscriptions
      on subscriptions.user_id = profiles.id
   where trim(coalesce(search_query, '')) = ''
      or profiles.name ilike '%' || trim(search_query) || '%'
   group by profiles.id
   order by profiles.name, profiles.id
   limit least(greatest(result_limit, 1), 100)
  offset greatest(result_offset, 0);
end;
$$;

create or replace function public.mark_alerts_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.alert_read_state (user_id, last_read_at)
  values ((select auth.uid()), now())
  on conflict (user_id) do update
    set last_read_at = excluded.last_read_at;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

create or replace function public.admin_get_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  select jsonb_build_object(
    'attendee_count', (select count(*) from public.profiles),
    'push_enabled_attendees', (
      select count(distinct user_id) from public.push_subscriptions
    ),
    'push_device_count', (select count(*) from public.push_subscriptions),
    'override_count', (
      select count(*) from public.sessions where status_override is not null
    ),
    'failed_dispatch_count', (
      select count(*) from public.notification_dispatches where status = 'failed'
    ),
    'current_session', (
      select to_jsonb(current_session)
        from (
          select id,
                 title,
                 room,
                 status,
                 status_override,
                 actual_started_at,
                 start_time,
                 end_time
            from public.sessions
           where status = 'ongoing'
           order by coalesce(actual_started_at, start_time) desc
           limit 1
        ) as current_session
    ),
    'next_session', (
      select to_jsonb(next_session)
        from (
          select id, title, room, status, start_time, end_time
            from public.sessions
           where status = 'not_started'
           order by start_time
           limit 1
        ) as next_session
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_list_notifications(
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  id uuid,
  type text,
  title text,
  body text,
  source text,
  audience_kind text,
  created_at timestamptz,
  recipient_count bigint,
  dispatch_status text,
  target_device_count integer,
  accepted_count integer,
  failed_count integer,
  pruned_count integer,
  no_subscription_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  return query
  select notifications.id,
         notifications.type,
         notifications.title,
         notifications.body,
         notifications.source,
         notifications.audience_kind,
         notifications.created_at,
         count(recipients.user_id),
         dispatches.status,
         dispatches.target_device_count,
         dispatches.accepted_count,
         dispatches.failed_count,
         dispatches.pruned_count,
         dispatches.no_subscription_count
    from public.notifications as notifications
    left join public.notification_recipients as recipients
      on recipients.notification_id = notifications.id
    left join public.notification_dispatches as dispatches
      on dispatches.notification_id = notifications.id
   group by notifications.id, dispatches.notification_id
   order by notifications.created_at desc
   limit least(greatest(result_limit, 1), 100)
  offset greatest(result_offset, 0);
end;
$$;

create or replace function public.admin_get_notification(
  target_notification_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  select jsonb_build_object(
    'notification', to_jsonb(notifications),
    'dispatch', to_jsonb(dispatches),
    'recipients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', profiles.id,
          'name', profiles.name,
          'push_device_count', (
            select count(*)
              from public.push_subscriptions as subscriptions
             where subscriptions.user_id = profiles.id
          )
        ) order by profiles.name
      )
        from public.notification_recipients as recipients
        join public.profiles as profiles on profiles.id = recipients.user_id
       where recipients.notification_id = notifications.id
    ), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', deliveries.user_id,
          'name', profiles.name,
          'device_id', deliveries.device_id,
          'status', deliveries.status,
          'status_code', deliveries.status_code,
          'error', deliveries.error,
          'attempted_at', deliveries.attempted_at
        ) order by deliveries.attempted_at desc
      )
        from public.notification_deliveries as deliveries
        left join public.profiles as profiles on profiles.id = deliveries.user_id
       where deliveries.notification_id = notifications.id
    ), '[]'::jsonb)
  ) into result
    from public.notifications as notifications
    left join public.notification_dispatches as dispatches
      on dispatches.notification_id = notifications.id
   where notifications.id = target_notification_id;

  return result;
end;
$$;

create or replace function public.admin_list_audit(
  result_limit integer default 100,
  result_offset integer default 0
)
returns table (
  id bigint,
  actor_id uuid,
  actor_name text,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  return query
  select audit.id,
         audit.actor_id,
         coalesce(profiles.name, 'Former admin'),
         audit.action,
         audit.entity_type,
         audit.entity_id,
         audit.details,
         audit.created_at
    from public.admin_audit_log as audit
    left join public.profiles as profiles on profiles.id = audit.actor_id
   order by audit.created_at desc
   limit least(greatest(result_limit, 1), 200)
  offset greatest(result_offset, 0);
end;
$$;

revoke all on function public.admin_create_notification(
  text, text, text, uuid[], uuid
) from public;
revoke all on function public.admin_set_session_status(
  uuid, text, boolean, uuid
) from public;
revoke all on function public.admin_search_attendees(
  text, integer, integer
) from public;
revoke all on function public.mark_alerts_read() from public;
revoke all on function public.current_user_is_admin() from public;
revoke all on function public.admin_get_dashboard() from public;
revoke all on function public.admin_list_notifications(integer, integer) from public;
revoke all on function public.admin_get_notification(uuid) from public;
revoke all on function public.admin_list_audit(integer, integer) from public;

grant execute on function public.admin_create_notification(
  text, text, text, uuid[], uuid
) to authenticated;
grant execute on function public.admin_set_session_status(
  uuid, text, boolean, uuid
) to authenticated;
grant execute on function public.admin_search_attendees(
  text, integer, integer
) to authenticated;
grant execute on function public.mark_alerts_read() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.admin_get_dashboard() to authenticated;
grant execute on function public.admin_list_notifications(integer, integer) to authenticated;
grant execute on function public.admin_get_notification(uuid) to authenticated;
grant execute on function public.admin_list_audit(integer, integer) to authenticated;

revoke insert, update, delete on public.admin_users from anon, authenticated;
revoke insert, update, delete on public.notification_recipients from anon, authenticated;
revoke insert, update, delete on public.notification_dispatches from anon, authenticated;
revoke insert, update, delete on public.notification_deliveries from anon, authenticated;
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

grant select on public.admin_users to authenticated;
grant select on public.notification_recipients to authenticated;
grant select on public.notification_dispatches to authenticated;
grant select on public.notification_deliveries to authenticated;
grant select on public.admin_audit_log to authenticated;

grant select on public.notifications to service_role;
grant select on public.notification_recipients to service_role;
grant select, update on public.notification_dispatches to service_role;
grant select, insert, update on public.notification_deliveries to service_role;
grant usage, select on sequence public.notification_deliveries_id_seq to service_role;
grant select, delete on public.push_subscriptions to service_role;
