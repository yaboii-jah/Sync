-- Trigger functions are invoked by Postgres and need no Data API callers.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.notify_push_webhook() from public, anon, authenticated;
