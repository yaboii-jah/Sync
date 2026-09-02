-- Legacy Data API auto-exposure left explicit anonymous EXECUTE grants even
-- after EXECUTE was revoked from PUBLIC. Keep the intended authenticated RPCs
-- while removing anonymous and direct trigger-function access.

revoke execute on function public.admin_create_notification(
  text, text, text, uuid[], uuid
) from anon;

revoke execute on function public.admin_set_session_status(
  uuid, text, boolean, uuid
) from anon;

revoke execute on function public.admin_search_attendees(
  text, integer, integer
) from anon;

revoke execute on function public.admin_get_dashboard() from anon;

revoke execute on function public.admin_list_notifications(integer, integer) from anon;

revoke execute on function public.admin_get_notification(uuid) from anon;

revoke execute on function public.admin_list_audit(integer, integer) from anon;

revoke execute on function public.current_user_is_admin() from anon;

revoke execute on function public.handle_new_user() from anon, authenticated;

revoke execute on function public.notify_push_webhook() from anon, authenticated;

revoke execute on function public.retry_push_dispatches() from anon, authenticated;
