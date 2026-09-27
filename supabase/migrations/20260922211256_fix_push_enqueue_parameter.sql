begin;
create or replace function private.enqueue_push(notification_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare webhook_secret text; function_url text;
begin
  select value into webhook_secret from private.app_secrets where name='push_webhook_secret';
  select value into function_url from private.app_secrets where name='push_function_url';
  if webhook_secret is null or function_url is null or function_url !~ '^https?://[^ ]+/functions/v1/send-push$' then
    update public.notification_dispatches as d set status='failed',attempt_count=3,
      last_error='push_not_configured',completed_at=now()
      where d.notification_id=enqueue_push.notification_id;
    return;
  end if;
  perform net.http_post(url:=function_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-webhook-secret',webhook_secret),
    body:=jsonb_build_object('id',enqueue_push.notification_id),timeout_milliseconds:=5000);
end $$;
commit;
