-- TEMPORARY diagnostic (drop after debugging): exposes recent pg_net
-- webhook responses so the push pipeline can be verified end to end.
-- Callable ONLY by the service role.

create or replace function public.debug_webhook_responses()
returns table (
  id bigint,
  status_code int,
  content text,
  created timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select r.id, r.status_code, r.content, r.created
    from net._http_response r
   order by r.id desc
   limit 10;
$$;

revoke execute on function public.debug_webhook_responses() from public;
revoke execute on function public.debug_webhook_responses() from anon;
revoke execute on function public.debug_webhook_responses() from authenticated;
grant execute on function public.debug_webhook_responses() to service_role;
