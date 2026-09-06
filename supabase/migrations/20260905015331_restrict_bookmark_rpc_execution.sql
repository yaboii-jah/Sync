-- Supabase's default privileges add explicit grants for anon and
-- authenticated, so revoking PUBLIC alone does not secure a new function.
revoke execute on function public.toggle_my_flow_bookmark(uuid)
  from anon, authenticated;
grant execute on function public.toggle_my_flow_bookmark(uuid)
  to authenticated;
