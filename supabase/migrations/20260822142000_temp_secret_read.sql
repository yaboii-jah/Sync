-- TEMPORARY diagnostic (drop after debugging): returns the webhook secret
-- stored in private.app_secrets so the Edge Function secret can be synced
-- out-of-band. Callable ONLY by the service role.

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
