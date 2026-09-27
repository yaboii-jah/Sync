begin;

-- Historical notices without a session belong to the archived AWS tenant.
alter table public.notifications add column event_id uuid;
update public.notifications n set event_id = coalesce(
  (select s.event_id from public.sessions s where s.id = n.related_session_id),
  (select e.id from public.events e where e.theme_preset = 'legacy_aws' order by e.id limit 1)
);
do $$ begin
  if exists (select 1 from public.notifications where event_id is null) then
    raise exception 'historical notifications cannot be assigned to an event';
  end if;
end $$;
alter table public.notifications alter column event_id set not null;
alter table public.notifications add constraint notifications_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
alter table public.notifications add constraint notifications_event_id_id_unique unique (event_id,id);
alter table public.notifications drop constraint notifications_related_session_id_fkey;
alter table public.notifications add constraint notifications_event_session_fkey
  foreign key (event_id,related_session_id) references public.sessions(event_id,id) on delete set null (related_session_id);
create index notifications_event_created_idx on public.notifications(event_id,created_at desc,id desc);

-- Keep legacy SQL functions usable while flag-off routes still serve AWS.
create or replace function private.assign_notification_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.event_id is null and new.related_session_id is not null then
    select event_id into new.event_id from public.sessions where id = new.related_session_id;
  end if;
  if new.event_id is null then
    select id into new.event_id from public.events where theme_preset = 'legacy_aws' order by id limit 1;
  end if;
  if new.event_id is null then raise exception 'notification event is required'; end if;
  return new;
end $$;
create trigger notifications_assign_event before insert on public.notifications
  for each row execute function private.assign_notification_event();
revoke all on function private.assign_notification_event() from public,anon,authenticated;

alter table public.notification_recipients add column event_id uuid;
update public.notification_recipients r set event_id = n.event_id from public.notifications n where n.id=r.notification_id;
alter table public.notification_recipients alter column event_id set not null;
alter table public.notification_recipients drop constraint notification_recipients_notification_id_fkey;
alter table public.notification_recipients add constraint notification_recipients_event_notification_fkey
  foreign key(event_id,notification_id) references public.notifications(event_id,id) on delete cascade;
create index notification_recipients_event_user_idx on public.notification_recipients(event_id,user_id,created_at desc);

alter table public.notification_dispatches add column event_id uuid;
update public.notification_dispatches d set event_id=n.event_id from public.notifications n where n.id=d.notification_id;
alter table public.notification_dispatches alter column event_id set not null;
alter table public.notification_dispatches drop constraint notification_dispatches_notification_id_fkey;
alter table public.notification_dispatches add constraint notification_dispatches_event_notification_fkey
  foreign key(event_id,notification_id) references public.notifications(event_id,id) on delete cascade;
create index notification_dispatches_event_created_idx on public.notification_dispatches(event_id,created_at desc);

alter table public.notification_deliveries add column event_id uuid;
update public.notification_deliveries d set event_id=n.event_id from public.notifications n where n.id=d.notification_id;
alter table public.notification_deliveries alter column event_id set not null;
alter table public.notification_deliveries drop constraint notification_deliveries_notification_id_fkey;
alter table public.notification_deliveries add constraint notification_deliveries_event_notification_fkey
  foreign key(event_id,notification_id) references public.notifications(event_id,id) on delete cascade;
create index notification_deliveries_event_notification_idx on public.notification_deliveries(event_id,notification_id,status);

alter table public.alert_read_state add column event_id uuid;
update public.alert_read_state set event_id=(select id from public.events where theme_preset='legacy_aws' order by id limit 1);
do $$ begin
  if exists (select 1 from public.alert_read_state where event_id is null) then
    raise exception 'historical alert reads cannot be assigned to an event';
  end if;
end $$;
alter table public.alert_read_state alter column event_id set not null;
alter table public.alert_read_state drop constraint alert_read_state_pkey;
alter table public.alert_read_state add constraint alert_read_state_pkey primary key(event_id,user_id);
alter table public.alert_read_state add constraint alert_read_state_event_id_fkey
  foreign key(event_id) references public.events(id) on delete cascade;

create table public.event_notification_preferences (
  event_id uuid not null,
  user_id uuid not null,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(event_id,user_id),
  constraint event_notification_preferences_membership_fkey
    foreign key(event_id,user_id) references public.event_memberships(event_id,user_id) on delete cascade
);
create index event_notification_preferences_user_idx on public.event_notification_preferences(user_id,event_id) where push_enabled;
alter table public.event_notification_preferences enable row level security;
-- Existing device consent remains enabled for the old event only.
insert into public.event_notification_preferences(event_id,user_id,push_enabled)
select distinct e.id,s.user_id,true from public.push_subscriptions s
cross join lateral (select id from public.events where theme_preset='legacy_aws' order by id limit 1) e
join public.event_memberships m on m.event_id=e.id and m.user_id=s.user_id and m.status='active'
on conflict do nothing;

drop policy "Recipients and admins can view notifications" on public.notifications;
create policy "Recipients and admins can view notifications" on public.notifications for select to authenticated using (
  (select private.has_event_role(event_id,array['owner','admin']))
  or (event_id = (select id from public.events where theme_preset='legacy_aws' order by id limit 1) and (select private.is_admin()))
  or (exists(select 1 from public.notification_recipients r where r.event_id=notifications.event_id
      and r.notification_id=notifications.id and r.user_id=(select auth.uid()))
      and (select private.has_event_role(event_id,array['owner','admin','attendee'])))
);
drop policy "Users can view own notification recipients" on public.notification_recipients;
create policy "Users can view own notification recipients" on public.notification_recipients for select to authenticated using (
  (user_id=(select auth.uid()) and (select private.has_event_role(event_id,array['owner','admin','attendee'])))
  or (select private.has_event_role(event_id,array['owner','admin']))
);
drop policy "Admins can view notification dispatches" on public.notification_dispatches;
create policy "Event staff can view notification dispatches" on public.notification_dispatches for select to authenticated
  using ((select private.has_event_role(event_id,array['owner','admin'])));
drop policy "Admins can view notification deliveries" on public.notification_deliveries;
create policy "Event staff can view notification deliveries" on public.notification_deliveries for select to authenticated
  using ((select private.has_event_role(event_id,array['owner','admin'])));
drop policy "Users can view own alert read state" on public.alert_read_state;
drop policy "Users can create own alert read state" on public.alert_read_state;
drop policy "Users can update own alert read state" on public.alert_read_state;
create policy "Members read own alert state" on public.alert_read_state for select to authenticated
  using (user_id=(select auth.uid()) and (select private.has_event_role(event_id,array['owner','admin','attendee'])));
create policy "Members create own alert state" on public.alert_read_state for insert to authenticated
  with check (user_id=(select auth.uid()) and (select private.has_event_role(event_id,array['owner','admin','attendee'])));
create policy "Members update own alert state" on public.alert_read_state for update to authenticated
  using (user_id=(select auth.uid()) and (select private.has_event_role(event_id,array['owner','admin','attendee'])))
  with check (user_id=(select auth.uid()) and (select private.has_event_role(event_id,array['owner','admin','attendee'])));
create policy "Members read own push preference" on public.event_notification_preferences for select to authenticated
  using (user_id=(select auth.uid()) and (select private.has_event_role(event_id,array['owner','admin','attendee'])));
revoke all on public.event_notification_preferences from public,anon,authenticated;
grant select on public.event_notification_preferences to authenticated;

create or replace function public.mark_event_alerts_read(target_event_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.has_event_role(target_event_id,array['owner','admin','attendee']) then raise exception 'active event membership required'; end if;
  insert into public.alert_read_state(event_id,user_id,last_read_at) values(target_event_id,(select auth.uid()),now())
  on conflict(event_id,user_id) do update set last_read_at=excluded.last_read_at;
end $$;
create or replace function public.mark_alerts_read()
returns void language plpgsql security definer set search_path='' as $$
declare legacy_event_id uuid;
begin
  select id into legacy_event_id from public.events where theme_preset='legacy_aws' order by id limit 1;
  if legacy_event_id is null then raise exception 'legacy event not found'; end if;
  perform public.mark_event_alerts_read(legacy_event_id);
end $$;

create or replace function public.set_event_push_preference(target_event_id uuid,enabled boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not private.has_event_role(target_event_id,array['owner','admin','attendee']) then raise exception 'active event membership required'; end if;
  if not exists(select 1 from public.events where id=target_event_id and lifecycle='published' and suspended_at is null)
    then raise exception 'event is not accepting push preferences'; end if;
  insert into public.event_notification_preferences(event_id,user_id,push_enabled)
    values(target_event_id,(select auth.uid()),enabled)
  on conflict(event_id,user_id) do update set push_enabled=excluded.push_enabled,updated_at=now();
  return enabled;
end $$;

create or replace function public.send_event_alert(
  target_event_id uuid,alert_title text,alert_body text,audience text,
  target_membership_ids uuid[],mutation_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); notice_id uuid; replay public.event_audit_log%rowtype; member_count integer;
begin
  replay := private.claim_event_request(target_event_id,'notification.send',mutation_request_id);
  if replay.id is not null then return jsonb_build_object('notification_id',replay.target_entity_id,'recipient_count',replay.details->'recipient_count'); end if;
  if not private.has_event_role(target_event_id,array['owner','admin']) then raise exception 'event staff access required'; end if;
  perform 1 from public.events where id=target_event_id and lifecycle='published' and suspended_at is null for update;
  if not found then raise exception 'event is not open for alerts'; end if;
  if char_length(btrim(coalesce(alert_title,''))) not between 1 and 80 or char_length(coalesce(alert_body,'')) > 240 then
    raise exception 'invalid alert content'; end if;
  if audience not in ('all','selected') then raise exception 'invalid audience'; end if;
  if audience='selected' then
    if coalesce(cardinality(target_membership_ids),0)=0 then raise exception 'select an active event member'; end if;
    select count(distinct m.id) into member_count from public.event_memberships m
      where m.event_id=target_event_id and m.status='active' and m.user_id is not null
        and m.id=any(target_membership_ids);
    if member_count <> (select count(distinct x) from unnest(target_membership_ids) x) or array_position(target_membership_ids,null) is not null
      then raise exception 'selected member is outside this event or inactive'; end if;
  end if;
  insert into public.notifications(event_id,type,title,body,source,created_by,audience_kind,audience_summary,request_id)
    values(target_event_id,'announcement',btrim(alert_title),nullif(btrim(coalesce(alert_body,'')),''),'admin',actor,audience,
      jsonb_build_object('kind',audience),mutation_request_id) returning id into notice_id;
  insert into public.notification_recipients(event_id,notification_id,user_id)
    select target_event_id,notice_id,m.user_id from public.event_memberships m
      where m.event_id=target_event_id and m.status='active' and m.user_id is not null
        and (audience='all' or m.id=any(target_membership_ids));
  get diagnostics member_count = row_count;
  insert into public.event_audit_log(event_id,actor_user_id,actor_membership_id,action,target_entity_type,target_entity_id,details,request_id)
    values(target_event_id,actor,private.current_event_membership_id(target_event_id,array['owner','admin']),
      'notification.send','notification',notice_id,jsonb_build_object('audience',audience,'recipient_count',member_count),mutation_request_id);
  return jsonb_build_object('notification_id',notice_id,'recipient_count',member_count);
end $$;

-- The same webhook remains the transport. Its endpoint is configured per environment.
create or replace function private.enqueue_push(notification_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare webhook_secret text; function_url text;
begin
  select value into webhook_secret from private.app_secrets where name='push_webhook_secret';
  select value into function_url from private.app_secrets where name='push_function_url';
  if webhook_secret is null or function_url is null or function_url !~ '^https?://[^ ]+/functions/v1/send-push$' then
    update public.notification_dispatches set status='failed',last_error='push_not_configured',completed_at=now()
      where notification_id=enqueue_push.notification_id;
    return;
  end if;
  perform net.http_post(url:=function_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-webhook-secret',webhook_secret),
    body:=jsonb_build_object('id',notification_id),timeout_milliseconds:=5000);
end $$;
create or replace function public.notify_push_webhook()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notification_dispatches(event_id,notification_id) values(new.event_id,new.id) on conflict do nothing;
  perform private.enqueue_push(new.id);
  return new;
end $$;
revoke all on function private.enqueue_push(uuid) from public,anon,authenticated;
revoke all on function public.notify_push_webhook() from public,anon,authenticated;

-- Legacy trigger writers omit event_id on recipient/delivery rows. Fill from the parent.
create or replace function private.assign_notification_child_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.event_id is null then select event_id into new.event_id from public.notifications where id=new.notification_id; end if;
  if new.event_id is null then raise exception 'notification event is required'; end if;
  return new;
end $$;
create trigger recipients_assign_event before insert on public.notification_recipients for each row execute function private.assign_notification_child_event();
create trigger deliveries_assign_event before insert on public.notification_deliveries for each row execute function private.assign_notification_child_event();
revoke all on function private.assign_notification_child_event() from public,anon,authenticated;

revoke all on function public.mark_event_alerts_read(uuid) from public,anon;
revoke all on function public.mark_alerts_read() from public,anon;
revoke all on function public.set_event_push_preference(uuid,boolean) from public,anon;
revoke all on function public.send_event_alert(uuid,text,text,text,uuid[],uuid) from public,anon;
grant execute on function public.mark_event_alerts_read(uuid) to authenticated;
grant execute on function public.mark_alerts_read() to authenticated;
grant execute on function public.set_event_push_preference(uuid,boolean) to authenticated;
grant execute on function public.send_event_alert(uuid,text,text,text,uuid[],uuid) to authenticated;

commit;
