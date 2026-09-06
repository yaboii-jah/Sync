-- Keep My Flow clean even when an admin action or schedule edit leaves a
-- session already marked finished before the minute job sees a transition.
create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
as $$
declare
  flipped record;
begin
  for flipped in
    select sessions.id,
           case
             when now() < sessions.start_time then 'not_started'
             when now() >= sessions.end_time then 'finished'
             else 'ongoing'
           end as new_status
      from public.sessions as sessions
     where sessions.published
       and sessions.status_override is null
       and sessions.status is distinct from (
         case
           when now() < sessions.start_time then 'not_started'
           when now() >= sessions.end_time then 'finished'
           else 'ongoing'
         end
       )
     for update skip locked
  loop
    update public.sessions
       set status = flipped.new_status
     where id = flipped.id;

    if flipped.new_status = 'finished' then
      delete from public.my_flow_bookmarks
       where session_id = flipped.id;
    end if;
  end loop;

  delete from public.my_flow_bookmarks as bookmarks
   using public.sessions as sessions
   where sessions.id = bookmarks.session_id
     and sessions.status = 'finished';

  update public.events
     set status = calculated.new_status
    from (
      select id,
             case
               when now() < starts_at then 'upcoming'
               when now() >= ends_at then 'ended'
               else 'started'
             end as new_status
        from public.events
    ) as calculated
   where public.events.id = calculated.id
     and public.events.status is distinct from calculated.new_status;
end;
$$;
