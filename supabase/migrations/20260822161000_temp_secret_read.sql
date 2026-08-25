-- TEMPORARY diagnostic (dropped in the next migration): lets the service
-- role read the push webhook secret so out-of-band tests can call the
-- send-push Edge Function directly.

create or replace function public.debug_push_webhook_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select value from private.app_secrets where name = 'push_webhook_secret';
$$;

revoke execute on function public.debug_push_webhook_secret() from public;
revoke execute on function public.debug_push_webhook_secret() from anon;
revoke execute on function public.debug_push_webhook_secret() from authenticated;
grant execute on function public.debug_push_webhook_secret() to service_role;
