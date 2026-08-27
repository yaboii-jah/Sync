-- Keep push controls device-scoped and remove completed sessions from My Flow.
-- Ended-session recipients are captured in the private webhook payload before
-- their bookmark rows are deleted.

delete from public.my_flow_bookmarks as bookmarks
using public.sessions as sessions
where sessions.id = bookmarks.session_id
  and now() >= sessions.end_time;

create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
as $$
declare
  flipped record;
  reminder record;
begin
  for flipped in
    select s.id,
           s.title,
           s.room,
           case
             when now() < s.start_time then 'not_started'
             when now() >= s.end_time then 'finished'
             else 'ongoing'
           end as new_status
      from public.sessions s
     where s.status is distinct from (
       case
         when now() < s.start_time then 'not_started'
         when now() >= s.end_time then 'finished'
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
      -- The notification trigger snapshots these bookmarkers before cleanup.
      insert into public.notifications (type, title, body, related_session_id)
      values ('session_ended', flipped.title || ' just wrapped up', null, flipped.id);

      delete from public.my_flow_bookmarks
       where session_id = flipped.id;
    end if;
  end loop;

  -- Starting-soon reminder: fires once per session, ~10 minutes before start.
  for reminder in
    select s.id, s.title, s.room
      from public.sessions s
     where s.status = 'not_started'
       and s.reminder_sent_at is null
       and s.start_time between now() + interval '9 minutes'
                             and now() + interval '11 minutes'
  loop
    insert into public.notifications (type, title, body, related_session_id)
    values (
      'session_reminder',
      reminder.title || ' starts in 10 minutes',
      'Head over to ' || coalesce(reminder.room, 'the venue') || '.',
      reminder.id
    );

    update public.sessions
       set reminder_sent_at = now()
     where id = reminder.id;
  end loop;

  update public.events
     set status = calc.new_status
    from (
      select id,
             case
               when now() < starts_at then 'upcoming'
               when now() >= ends_at then 'ended'
               else 'started'
             end as new_status
        from public.events
    ) calc
   where public.events.id = calc.id
     and public.events.status is distinct from calc.new_status;
end;
$$;

create or replace function public.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
  target_user_ids jsonb;
begin
  select value into webhook_secret
    from private.app_secrets
   where name = 'push_webhook_secret';

  if new.related_session_id is null then
    target_user_ids := null;
  else
    select coalesce(jsonb_agg(bookmarks.user_id), '[]'::jsonb)
      into target_user_ids
      from public.my_flow_bookmarks as bookmarks
     where bookmarks.session_id = new.related_session_id;
  end if;

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
      'body', new.body,
      'related_session_id', new.related_session_id,
      'target_user_ids', target_user_ids
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;
