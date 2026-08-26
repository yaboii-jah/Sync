-- Allow an authenticated attendee to create their own profile row. The
-- on_auth_user_created trigger is the primary source, but this policy makes
-- profile creation self-healing at the app layer too (e.g. when the trigger
-- was never deployed, or the row was deleted while the auth.users row remains
-- and the insert trigger cannot re-fire).

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);
