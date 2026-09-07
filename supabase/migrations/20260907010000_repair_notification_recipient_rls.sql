-- Repair notification read isolation on projects where the legacy broad
-- notifications SELECT policy survived the admin-operations migration.
-- Push delivery already reads the recipient snapshot; this makes the Alerts
-- feed use the same snapshot at the database boundary.

do $$
declare
  policy_name text;
begin
  -- notifications is read-only for client roles and should have one explicit
  -- SELECT policy. Remove any drifted policy rather than relying on its name.
  for policy_name in
    select policies.polname
      from pg_policy as policies
      join pg_class as relations on relations.oid = policies.polrelid
      join pg_namespace as namespaces on namespaces.oid = relations.relnamespace
     where namespaces.nspname = 'public'
       and relations.relname = 'notifications'
  loop
    execute format(
      'drop policy if exists %I on public.notifications',
      policy_name
    );
  end loop;
end;
$$;

alter table public.notifications enable row level security;

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated, service_role;

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
