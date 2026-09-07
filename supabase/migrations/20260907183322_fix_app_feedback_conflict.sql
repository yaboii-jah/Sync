-- The attendee role cannot read the owner/request columns. Leaving the
-- conflict target implicit preserves idempotent retries without requiring
-- SELECT privileges on those columns.
create or replace function public.submit_app_feedback(
  feedback_category text,
  feedback_message text,
  feedback_request_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.app_feedback (category, message, request_id)
  values (
    feedback_category,
    btrim(feedback_message),
    feedback_request_id
  )
  on conflict do nothing;
end;
$$;
