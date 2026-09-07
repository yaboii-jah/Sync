-- The preceding feedback version was recorded remotely as a no-op. This
-- forward migration carries the actual schema and access model.

create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  category text not null
    check (category in ('bug', 'usability', 'idea')),
  message text not null
    check (char_length(btrim(message)) between 1 and 2000),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint app_feedback_request_unique unique (user_id, request_id)
);

create index app_feedback_created_at_idx
  on public.app_feedback (created_at desc, id desc);

alter table public.app_feedback enable row level security;

revoke all on table public.app_feedback from public, anon, authenticated;

grant insert (category, message, request_id)
  on public.app_feedback to authenticated;

create policy "Authenticated users can submit own app feedback"
  on public.app_feedback for insert to authenticated
  with check ((select auth.uid()) = user_id);

create function public.submit_app_feedback(
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
  on conflict (user_id, request_id) do nothing;
end;
$$;

create function public.admin_list_feedback(
  result_limit integer default 100
)
returns table (
  id uuid,
  category text,
  message text,
  attendee_name text,
  attendee_photo_url text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  return query
  select feedback.id,
         feedback.category,
         feedback.message,
         profiles.name,
         profiles.photo_url,
         feedback.created_at
    from public.app_feedback as feedback
    join public.profiles as profiles
      on profiles.id = feedback.user_id
   order by feedback.created_at desc, feedback.id desc
   limit least(greatest(result_limit, 1), 100);
end;
$$;

revoke all on function public.submit_app_feedback(text, text, uuid)
  from public, anon;
grant execute on function public.submit_app_feedback(text, text, uuid)
  to authenticated;

revoke all on function public.admin_list_feedback(integer) from public, anon;
grant execute on function public.admin_list_feedback(integer) to authenticated;

insert into public.quick_links (label, url, icon)
select 'Feedback', '/more/feedback', 'message-square'
 where not exists (
   select 1
     from public.quick_links
    where label = 'Feedback'
      and url = '/more/feedback'
 );
