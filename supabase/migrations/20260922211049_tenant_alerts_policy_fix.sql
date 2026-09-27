begin;

-- A non-member legacy admin cannot see the events row through event RLS.
-- Resolve the compatibility event inside a fixed-search-path definer instead.
create function private.legacy_notification_event_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.events where theme_preset = 'legacy_aws' order by id limit 1
$$;
revoke all on function private.legacy_notification_event_id() from public, anon, authenticated;
grant execute on function private.legacy_notification_event_id() to authenticated;

drop policy "Recipients and admins can view notifications" on public.notifications;
create policy "Recipients and admins can view notifications" on public.notifications for select to authenticated using (
  (select private.has_event_role(event_id,array['owner','admin']))
  or (event_id = (select private.legacy_notification_event_id()) and (select private.is_admin()))
  or (exists(select 1 from public.notification_recipients r where r.event_id=notifications.event_id
      and r.notification_id=notifications.id and r.user_id=(select auth.uid()))
      and (select private.has_event_role(event_id,array['owner','admin','attendee'])))
);

-- Missing transport configuration is not transient; do not schedule retries.
create or replace function private.enqueue_push(notification_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare webhook_secret text; function_url text;
begin
  select value into webhook_secret from private.app_secrets where name='push_webhook_secret';
  select value into function_url from private.app_secrets where name='push_function_url';
  if webhook_secret is null or function_url is null or function_url !~ '^https?://[^ ]+/functions/v1/send-push$' then
    update public.notification_dispatches set status='failed',attempt_count=3,
      last_error='push_not_configured',completed_at=now()
      where notification_id=enqueue_push.notification_id;
    return;
  end if;
  perform net.http_post(url:=function_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-webhook-secret',webhook_secret),
    body:=jsonb_build_object('id',notification_id),timeout_milliseconds:=5000);
end $$;

commit;
