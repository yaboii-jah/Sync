-- Tenant-scoped event program content and authoring operations. The route tree
-- remains feature flagged; this migration closes the database boundaries that
-- must exist before users can create more than one event.

begin;

alter table public.speakers_sponsors
  add column event_id uuid,
  add column published boolean not null default true,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

alter table public.session_speakers add column event_id uuid;
alter table public.my_flow_bookmarks add column event_id uuid;

do $$
begin
  if exists (
    select links.speaker_id
      from public.session_speakers as links
      join public.sessions as sessions on sessions.id = links.session_id
     group by links.speaker_id
    having count(distinct sessions.event_id) > 1
  ) then
    raise exception 'a legacy speaker is linked to sessions in multiple events';
  end if;
end;
$$;

update public.speakers_sponsors as speakers
   set event_id = linked.event_id
  from (
    select links.speaker_id, min(sessions.event_id::text)::uuid as event_id
      from public.session_speakers as links
      join public.sessions as sessions on sessions.id = links.session_id
     group by links.speaker_id
  ) as linked
 where speakers.id = linked.speaker_id;

update public.speakers_sponsors
   set event_id = (
     select id from public.events
      where slug = 'aws-student-community-day-mega-manila-2026'
   )
 where event_id is null;

update public.session_speakers as links
   set event_id = sessions.event_id
  from public.sessions as sessions
 where sessions.id = links.session_id;

update public.my_flow_bookmarks as bookmarks
   set event_id = sessions.event_id
  from public.sessions as sessions
 where sessions.id = bookmarks.session_id;

do $$
begin
  if exists (select 1 from public.speakers_sponsors where event_id is null)
     or exists (select 1 from public.session_speakers where event_id is null)
     or exists (select 1 from public.my_flow_bookmarks where event_id is null) then
    raise exception 'legacy program rows could not be assigned to an event';
  end if;

  if exists (
    select 1
      from public.sessions as sessions
      join public.events as events on events.id = sessions.event_id
     where sessions.start_time < events.starts_at
        or sessions.end_time > events.ends_at
  ) then
    raise exception 'legacy sessions fall outside their event window';
  end if;
end;
$$;

alter table public.sessions
  add constraint sessions_event_id_id_unique unique (event_id, id);

alter table public.speakers_sponsors
  alter column event_id set not null,
  add constraint speakers_sponsors_event_id_fkey
    foreign key (event_id) references public.events (id) on delete cascade,
  add constraint speakers_sponsors_event_id_id_unique unique (event_id, id);

alter table public.session_speakers
  drop constraint session_speakers_session_id_fkey,
  drop constraint session_speakers_speaker_id_fkey,
  alter column event_id set not null,
  add constraint session_speakers_session_fkey
    foreign key (event_id, session_id)
    references public.sessions (event_id, id) on delete cascade,
  add constraint session_speakers_speaker_fkey
    foreign key (event_id, speaker_id)
    references public.speakers_sponsors (event_id, id) on delete cascade;

alter table public.my_flow_bookmarks
  drop constraint my_flow_bookmarks_session_id_fkey,
  alter column event_id set not null,
  add constraint my_flow_bookmarks_session_fkey
    foreign key (event_id, session_id)
    references public.sessions (event_id, id) on delete cascade;

create index sessions_event_published_start_idx
  on public.sessions (event_id, published, start_time, end_time, id);
create index speakers_sponsors_event_published_name_idx
  on public.speakers_sponsors (event_id, published, name, id);
create index session_speakers_event_speaker_idx
  on public.session_speakers (event_id, speaker_id, session_id);
create index my_flow_bookmarks_event_user_created_idx
  on public.my_flow_bookmarks (event_id, user_id, created_at, session_id);

alter publication supabase_realtime add table public.speakers_sponsors;
alter publication supabase_realtime add table public.session_speakers;

create trigger speakers_sponsors_set_updated_at
  before update on public.speakers_sponsors
  for each row execute function public.set_updated_at();

create or replace function private.enforce_session_event_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  event_start timestamptz;
  event_end timestamptz;
begin
  select starts_at, ends_at into event_start, event_end
    from public.events where id = new.event_id;
  if not found then raise exception 'event not found'; end if;
  if new.start_time < event_start or new.end_time > event_end then
    raise exception 'session must be within the event window';
  end if;
  return new;
end;
$$;

create trigger sessions_enforce_event_window
  before insert or update of event_id, start_time, end_time on public.sessions
  for each row execute function private.enforce_session_event_window();

create or replace function private.protect_event_session_window()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at)
     and exists (
       select 1 from public.sessions
        where event_id = new.id
          and (start_time < new.starts_at or end_time > new.ends_at)
     ) then
    raise exception 'event window must contain every existing session';
  end if;
  return new;
end;
$$;

create trigger events_protect_session_window
  before update of starts_at, ends_at on public.events
  for each row execute function private.protect_event_session_window();

revoke all on function private.enforce_session_event_window() from public, anon, authenticated;
revoke all on function private.protect_event_session_window() from public, anon, authenticated;

drop policy "Authenticated users can view events" on public.events;
create policy "Authorized users can view events"
  on public.events for select to authenticated
  using (
    (select private.is_platform_super_admin())
    or (select private.has_event_role(id, array['owner', 'admin', 'attendee']))
  );

drop policy "Authenticated users can view published sessions" on public.sessions;
create policy "Authorized users can view event sessions"
  on public.sessions for select to authenticated
  using (
    (select private.has_event_support_access(event_id))
    or exists (
      select 1 from public.events
       where events.id = sessions.event_id
         and events.suspended_at is null
         and (
           (select private.has_event_role(sessions.event_id, array['owner', 'admin']))
           or (
             sessions.published
             and events.lifecycle in ('published', 'archived')
             and (select private.has_event_role(
               sessions.event_id, array['owner', 'admin', 'attendee']
             ))
           )
         )
    )
  );

drop policy "Authenticated users can view speakers/sponsors" on public.speakers_sponsors;
create policy "Authorized users can view event speakers"
  on public.speakers_sponsors for select to authenticated
  using (
    (select private.has_event_support_access(event_id))
    or exists (
      select 1 from public.events
       where events.id = speakers_sponsors.event_id
         and events.suspended_at is null
         and (
           (select private.has_event_role(
             speakers_sponsors.event_id, array['owner', 'admin']
           ))
           or (
             speakers_sponsors.published
             and events.lifecycle in ('published', 'archived')
             and (select private.has_event_role(
               speakers_sponsors.event_id, array['owner', 'admin', 'attendee']
             ))
           )
         )
    )
  );

drop policy "Authenticated users can view session-speaker links" on public.session_speakers;
create policy "Authorized users can view event session speakers"
  on public.session_speakers for select to authenticated
  using (
    (select private.has_event_support_access(event_id))
    or exists (
      select 1
        from public.events
        join public.sessions
          on sessions.event_id = events.id and sessions.id = session_speakers.session_id
        join public.speakers_sponsors
          on speakers_sponsors.event_id = events.id
         and speakers_sponsors.id = session_speakers.speaker_id
       where events.id = session_speakers.event_id
         and events.suspended_at is null
         and (
           (select private.has_event_role(
             session_speakers.event_id, array['owner', 'admin']
           ))
           or (
             events.lifecycle in ('published', 'archived')
             and sessions.published
             and speakers_sponsors.published
             and (select private.has_event_role(
               session_speakers.event_id, array['owner', 'admin', 'attendee']
             ))
           )
         )
    )
  );

drop policy "Users can view own bookmarks" on public.my_flow_bookmarks;
create policy "Active members can view own event bookmarks"
  on public.my_flow_bookmarks for select to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.has_event_role(
      event_id, array['owner', 'admin', 'attendee']
    ))
    and exists (
      select 1 from public.events
       where events.id = my_flow_bookmarks.event_id
         and events.suspended_at is null
         and events.lifecycle in ('published', 'archived')
    )
  );

revoke all on table public.sessions from public, anon, authenticated;
revoke all on table public.speakers_sponsors from public, anon, authenticated;
revoke all on table public.session_speakers from public, anon, authenticated;
revoke all on table public.my_flow_bookmarks from public, anon, authenticated;
grant select on table public.sessions to authenticated;
grant select on table public.speakers_sponsors to authenticated;
grant select on table public.session_speakers to authenticated;
grant select on table public.my_flow_bookmarks to authenticated;

create or replace function private.event_session_limit(target_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(overrides.event_session_limit, 500)
    from public.event_memberships as owner
    left join public.platform_quota_overrides as overrides
      on overrides.user_id = owner.user_id
   where owner.event_id = target_event_id
     and owner.role = 'owner'
     and owner.status = 'active';
$$;

revoke all on function private.event_session_limit(uuid)
  from public, anon, authenticated;

create or replace function public.get_public_event_program(event_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  result jsonb;
begin
  select * into target_event from public.events
   where lower(slug) = lower(btrim(event_slug))
     and lifecycle = 'published'
     and suspended_at is null;
  if not found then return null; end if;

  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', target_event.id,
      'slug', target_event.slug,
      'name', target_event.name,
      'description', target_event.description,
      'venue', target_event.venue,
      'starts_at', target_event.starts_at,
      'ends_at', target_event.ends_at,
      'timezone', target_event.timezone,
      'theme_preset', target_event.theme_preset,
      'accent_color', target_event.accent_color,
      'logo_path', target_event.logo_path,
      'cover_path', target_event.cover_path
    ),
    'sessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sessions.id,
          'title', sessions.title,
          'description', sessions.description,
          'room', sessions.room,
          'start_time', sessions.start_time,
          'end_time', sessions.end_time,
          'status', sessions.status,
          'speaker_ids', coalesce((
            select jsonb_agg(links.speaker_id order by links.speaker_id)
              from public.session_speakers as links
              join public.speakers_sponsors as speakers
                on speakers.event_id = links.event_id
               and speakers.id = links.speaker_id
             where links.event_id = target_event.id
               and links.session_id = sessions.id
               and speakers.published
          ), '[]'::jsonb)
        ) order by sessions.start_time, sessions.end_time, sessions.title, sessions.id
      ) from public.sessions as sessions
       where sessions.event_id = target_event.id and sessions.published
    ), '[]'::jsonb),
    'speakers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', speakers.id,
          'name', speakers.name,
          'photo_url', speakers.photo_url,
          'role', speakers.role,
          'organization', speakers.organization,
          'bio', speakers.bio,
          'linkedin_url', speakers.linkedin_url
        ) order by speakers.name, speakers.id
      ) from public.speakers_sponsors as speakers
       where speakers.event_id = target_event.id and speakers.published
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_public_event_program(text) from public;
grant execute on function public.get_public_event_program(text) to anon, authenticated;

create or replace function public.admin_create_session(
  target_event_id uuid,
  session_title text,
  session_description text,
  session_room text,
  session_start_time timestamptz,
  session_end_time timestamptz,
  session_published boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  target_event public.events%rowtype;
  created_id uuid;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'session.create', mutation_request_id
  );
  if replay.id is not null then return replay.target_entity_id; end if;

  actor_membership_id := private.current_event_membership_id(
    target_event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(target_event_id) then
    raise exception 'event staff access required';
  end if;
  if coalesce(btrim(session_title), '') = '' then raise exception 'title is required'; end if;
  if session_start_time is null or session_end_time is null
     or session_end_time <= session_start_time then
    raise exception 'end time must be after start time';
  end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  if session_start_time < target_event.starts_at or session_end_time > target_event.ends_at then
    raise exception 'session must be within the event window';
  end if;
  if (select count(*) from public.sessions where event_id = target_event_id)
     >= coalesce(private.event_session_limit(target_event_id), 500) then
    raise exception 'event session limit reached';
  end if;

  insert into public.sessions (
    event_id, title, description, room, start_time, end_time, published, status
  ) values (
    target_event_id, btrim(session_title),
    nullif(btrim(coalesce(session_description, '')), ''),
    nullif(btrim(coalesce(session_room, '')), ''),
    session_start_time, session_end_time, coalesce(session_published, false),
    case when now() < session_start_time then 'not_started'
         when now() >= session_end_time then 'finished' else 'ongoing' end
  ) returning id into created_id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    target_event_id, actor, actor_membership_id, 'session.create',
    'session', created_id,
    jsonb_build_object('title', btrim(session_title), 'published', coalesce(session_published, false)),
    mutation_request_id
  );
  return created_id;
end;
$$;

create or replace function public.admin_update_session(
  target_session_id uuid,
  session_title text,
  session_description text,
  session_room text,
  session_start_time timestamptz,
  session_end_time timestamptz,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  select * into current_session from public.sessions
   where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(
    current_session.event_id, 'session.update', mutation_request_id, target_session_id
  );
  if replay.id is not null then return target_session_id; end if;

  actor_membership_id := private.current_event_membership_id(
    current_session.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_session.event_id) then
    raise exception 'event staff access required';
  end if;
  if coalesce(btrim(session_title), '') = '' then raise exception 'title is required'; end if;
  if session_start_time is null or session_end_time is null
     or session_end_time <= session_start_time then
    raise exception 'end time must be after start time';
  end if;

  select * into target_event from public.events
   where id = current_session.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  if session_start_time < target_event.starts_at or session_end_time > target_event.ends_at then
    raise exception 'session must be within the event window';
  end if;

  update public.sessions
     set title = btrim(session_title),
         description = nullif(btrim(coalesce(session_description, '')), ''),
         room = nullif(btrim(coalesce(session_room, '')), ''),
         start_time = session_start_time,
         end_time = session_end_time,
         reminder_sent_at = case
           when session_start_time is distinct from current_session.start_time then null
           else current_session.reminder_sent_at end,
         status = case
           when current_session.status_override is not null then current_session.status
           when now() < session_start_time then 'not_started'
           when now() >= session_end_time then 'finished' else 'ongoing' end
   where id = target_session_id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_session.event_id, actor, actor_membership_id, 'session.update',
    'session', target_session_id,
    jsonb_build_object(
      'title', btrim(session_title),
      'moved', session_start_time is distinct from current_session.start_time
    ), mutation_request_id
  );
  return target_session_id;
end;
$$;

create or replace function public.admin_set_session_published(
  target_session_id uuid,
  next_published boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  action_name text;
  replay public.event_audit_log%rowtype;
begin
  if next_published is null then raise exception 'published state is required'; end if;
  action_name := case when next_published then 'session.publish' else 'session.unpublish' end;
  select * into current_session from public.sessions
   where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(
    current_session.event_id, action_name, mutation_request_id, target_session_id
  );
  if replay.id is not null then return target_session_id; end if;

  actor_membership_id := private.current_event_membership_id(
    current_session.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_session.event_id) then
    raise exception 'event staff access required';
  end if;
  select * into target_event from public.events
   where id = current_session.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;

  update public.sessions set published = next_published where id = target_session_id;
  if not next_published then
    delete from public.my_flow_bookmarks where session_id = target_session_id;
  end if;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_session.event_id, actor, actor_membership_id, action_name,
    'session', target_session_id,
    jsonb_build_object('title', current_session.title), mutation_request_id
  );
  return target_session_id;
end;
$$;

create or replace function public.admin_delete_session(
  target_session_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  select * into current_session from public.sessions
   where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(
    current_session.event_id, 'session.delete', mutation_request_id, target_session_id
  );
  if replay.id is not null then return target_session_id; end if;
  actor_membership_id := private.current_event_membership_id(
    current_session.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_session.event_id) then
    raise exception 'event staff access required';
  end if;
  select * into target_event from public.events
   where id = current_session.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  if current_session.published then
    raise exception 'only unpublished draft sessions can be deleted; unpublish instead';
  end if;
  if current_session.status <> 'not_started' then
    raise exception 'only sessions that have not started can be deleted; unpublish instead';
  end if;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_session.event_id, actor, actor_membership_id, 'session.delete',
    'session', target_session_id,
    jsonb_build_object('title', current_session.title), mutation_request_id
  );
  delete from public.sessions where id = target_session_id;
  return target_session_id;
end;
$$;

create or replace function public.admin_create_speaker(
  target_event_id uuid,
  speaker_name text,
  speaker_photo_url text,
  speaker_role text,
  speaker_organization text,
  speaker_bio text,
  speaker_linkedin_url text,
  speaker_published boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  target_event public.events%rowtype;
  created_id uuid;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'speaker.create', mutation_request_id
  );
  if replay.id is not null then return replay.target_entity_id; end if;
  actor_membership_id := private.current_event_membership_id(
    target_event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(target_event_id) then
    raise exception 'event staff access required';
  end if;
  if char_length(btrim(coalesce(speaker_name, ''))) not between 1 and 200 then
    raise exception 'speaker name is required';
  end if;
  if speaker_role is null
     or speaker_role not in ('speaker', 'host', 'panelist', 'sponsor') then
    raise exception 'invalid speaker role';
  end if;
  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;

  insert into public.speakers_sponsors (
    event_id, name, photo_url, role, organization, bio, linkedin_url, published
  ) values (
    target_event_id, btrim(speaker_name),
    nullif(btrim(coalesce(speaker_photo_url, '')), ''), speaker_role,
    nullif(btrim(coalesce(speaker_organization, '')), ''),
    nullif(btrim(coalesce(speaker_bio, '')), ''),
    nullif(btrim(coalesce(speaker_linkedin_url, '')), ''),
    coalesce(speaker_published, false)
  ) returning id into created_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    target_event_id, actor, actor_membership_id, 'speaker.create',
    'speaker', created_id,
    jsonb_build_object('name', btrim(speaker_name), 'published', coalesce(speaker_published, false)),
    mutation_request_id
  );
  return created_id;
end;
$$;

create or replace function public.admin_update_speaker(
  target_speaker_id uuid,
  speaker_name text,
  speaker_photo_url text,
  speaker_role text,
  speaker_organization text,
  speaker_bio text,
  speaker_linkedin_url text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_speaker public.speakers_sponsors%rowtype;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  select * into current_speaker from public.speakers_sponsors
   where id = target_speaker_id for update;
  if not found then raise exception 'speaker not found'; end if;
  replay := private.claim_event_request(
    current_speaker.event_id, 'speaker.update', mutation_request_id, target_speaker_id
  );
  if replay.id is not null then return target_speaker_id; end if;
  actor_membership_id := private.current_event_membership_id(
    current_speaker.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_speaker.event_id) then
    raise exception 'event staff access required';
  end if;
  if char_length(btrim(coalesce(speaker_name, ''))) not between 1 and 200 then
    raise exception 'speaker name is required';
  end if;
  if speaker_role is null
     or speaker_role not in ('speaker', 'host', 'panelist', 'sponsor') then
    raise exception 'invalid speaker role';
  end if;
  select * into target_event from public.events
   where id = current_speaker.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  update public.speakers_sponsors
     set name = btrim(speaker_name),
         photo_url = nullif(btrim(coalesce(speaker_photo_url, '')), ''),
         role = speaker_role,
         organization = nullif(btrim(coalesce(speaker_organization, '')), ''),
         bio = nullif(btrim(coalesce(speaker_bio, '')), ''),
         linkedin_url = nullif(btrim(coalesce(speaker_linkedin_url, '')), '')
   where id = target_speaker_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_speaker.event_id, actor, actor_membership_id, 'speaker.update',
    'speaker', target_speaker_id,
    jsonb_build_object('name', btrim(speaker_name)), mutation_request_id
  );
  return target_speaker_id;
end;
$$;

create or replace function public.admin_set_speaker_published(
  target_speaker_id uuid,
  next_published boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_speaker public.speakers_sponsors%rowtype;
  target_event public.events%rowtype;
  action_name text;
  replay public.event_audit_log%rowtype;
begin
  if next_published is null then raise exception 'published state is required'; end if;
  action_name := case when next_published then 'speaker.publish' else 'speaker.unpublish' end;
  select * into current_speaker from public.speakers_sponsors
   where id = target_speaker_id for update;
  if not found then raise exception 'speaker not found'; end if;
  replay := private.claim_event_request(
    current_speaker.event_id, action_name, mutation_request_id, target_speaker_id
  );
  if replay.id is not null then return target_speaker_id; end if;
  actor_membership_id := private.current_event_membership_id(
    current_speaker.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_speaker.event_id) then
    raise exception 'event staff access required';
  end if;
  select * into target_event from public.events
   where id = current_speaker.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  update public.speakers_sponsors set published = next_published
   where id = target_speaker_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_speaker.event_id, actor, actor_membership_id, action_name,
    'speaker', target_speaker_id,
    jsonb_build_object('name', current_speaker.name), mutation_request_id
  );
  return target_speaker_id;
end;
$$;

create or replace function public.admin_delete_speaker(
  target_speaker_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_speaker public.speakers_sponsors%rowtype;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  select * into current_speaker from public.speakers_sponsors
   where id = target_speaker_id for update;
  if not found then raise exception 'speaker not found'; end if;
  replay := private.claim_event_request(
    current_speaker.event_id, 'speaker.delete', mutation_request_id, target_speaker_id
  );
  if replay.id is not null then return target_speaker_id; end if;
  actor_membership_id := private.current_event_membership_id(
    current_speaker.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_speaker.event_id) then
    raise exception 'event staff access required';
  end if;
  select * into target_event from public.events
   where id = current_speaker.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  if current_speaker.published then
    raise exception 'only unpublished speakers can be deleted; unpublish instead';
  end if;
  if exists (select 1 from public.session_speakers where speaker_id = target_speaker_id) then
    raise exception 'linked speakers must be unlinked before deletion';
  end if;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_speaker.event_id, actor, actor_membership_id, 'speaker.delete',
    'speaker', target_speaker_id,
    jsonb_build_object('name', current_speaker.name), mutation_request_id
  );
  delete from public.speakers_sponsors where id = target_speaker_id;
  return target_speaker_id;
end;
$$;

create or replace function public.admin_set_session_speakers(
  target_session_id uuid,
  target_speaker_ids uuid[],
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  normalized_ids uuid[] := coalesce(target_speaker_ids, '{}'::uuid[]);
  replay public.event_audit_log%rowtype;
begin
  select * into current_session from public.sessions
   where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(
    current_session.event_id, 'session.set_speakers', mutation_request_id, target_session_id
  );
  if replay.id is not null then return target_session_id; end if;
  actor_membership_id := private.current_event_membership_id(
    current_session.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_session.event_id) then
    raise exception 'event staff access required';
  end if;
  if cardinality(normalized_ids) > 50
     or exists (
       select 1 from unnest(normalized_ids) as ids(speaker_id)
        where ids.speaker_id is null
     )
     or (select count(*) from unnest(normalized_ids))
        <> (
          select count(distinct ids.speaker_id)
            from unnest(normalized_ids) as ids(speaker_id)
        ) then
    raise exception 'speaker list is invalid';
  end if;
  select * into target_event from public.events
   where id = current_session.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  perform 1 from public.speakers_sponsors
   where event_id = current_session.event_id and id = any(normalized_ids)
   order by id for update;
  if (select count(*) from public.speakers_sponsors
       where event_id = current_session.event_id and id = any(normalized_ids))
     <> cardinality(normalized_ids) then
    raise exception 'every speaker must belong to the session event';
  end if;

  delete from public.session_speakers
   where event_id = current_session.event_id and session_id = target_session_id;
  insert into public.session_speakers (event_id, session_id, speaker_id)
  select current_session.event_id, target_session_id, ids.speaker_id
    from unnest(normalized_ids) as ids(speaker_id);
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_session.event_id, actor, actor_membership_id, 'session.set_speakers',
    'session', target_session_id,
    jsonb_build_object('speaker_ids', to_jsonb(normalized_ids)), mutation_request_id
  );
  return target_session_id;
end;
$$;

create or replace function public.admin_set_session_status(
  target_session_id uuid,
  action text,
  send_notification boolean,
  mutation_request_id uuid
)
returns table (
  session_id uuid,
  status text,
  status_override text,
  status_override_at timestamptz,
  actual_started_at timestamptz,
  actual_ended_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  next_status text;
  replay public.event_audit_log%rowtype;
begin
  if coalesce(send_notification, false) then
    raise exception 'event notifications are not yet available';
  end if;
  if $2 not in ('start', 'end', 'resume_auto') then
    raise exception 'invalid session action';
  end if;
  select * into current_session from public.sessions
   where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(
    current_session.event_id, 'session.' || $2, mutation_request_id, target_session_id
  );
  if replay.id is not null then
    return query select sessions.id, sessions.status, sessions.status_override,
      sessions.status_override_at, sessions.actual_started_at, sessions.actual_ended_at
      from public.sessions as sessions where sessions.id = target_session_id;
    return;
  end if;
  actor_membership_id := private.current_event_membership_id(
    current_session.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_session.event_id) then
    raise exception 'event staff access required';
  end if;
  select * into target_event from public.events
   where id = current_session.event_id for update;
  if target_event.lifecycle <> 'published' or target_event.suspended_at is not null
     or not current_session.published then
    raise exception 'session operations are read-only';
  end if;

  if $2 = 'start' then
    if current_session.status = 'ongoing' then raise exception 'session is already ongoing'; end if;
    if current_session.status = 'finished' then
      raise exception 'finished sessions cannot be restarted';
    end if;
    next_status := 'ongoing';
    update public.sessions
       set status = next_status, status_override = next_status,
           status_override_at = now(), status_override_by = actor,
           actual_started_at = now(), actual_ended_at = null
     where id = target_session_id;
  elsif $2 = 'end' then
    if current_session.status = 'finished' then raise exception 'session is already finished'; end if;
    next_status := 'finished';
    update public.sessions
       set status = next_status, status_override = next_status,
           status_override_at = now(), status_override_by = actor,
           actual_ended_at = now()
     where id = target_session_id;
    delete from public.my_flow_bookmarks as bookmarks
     where bookmarks.event_id = current_session.event_id
       and bookmarks.session_id = target_session_id;
  else
    if current_session.status_override is null then
      raise exception 'session is already using automatic status';
    end if;
    next_status := case when now() < current_session.start_time then 'not_started'
      when now() >= current_session.end_time then 'finished' else 'ongoing' end;
    update public.sessions
       set status = next_status, status_override = null,
           status_override_at = null, status_override_by = null
     where id = target_session_id;
  end if;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_session.event_id, actor, actor_membership_id, 'session.' || $2,
    'session', target_session_id,
    jsonb_build_object(
      'before_status', current_session.status,
      'before_override', current_session.status_override,
      'after_status', next_status
    ), mutation_request_id
  );
  return query select sessions.id, sessions.status, sessions.status_override,
    sessions.status_override_at, sessions.actual_started_at, sessions.actual_ended_at
    from public.sessions as sessions where sessions.id = target_session_id;
end;
$$;

create or replace function public.toggle_my_flow_bookmark(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  target_event public.events%rowtype;
  already_bookmarked boolean;
  conflicts jsonb;
begin
  if actor is null then raise exception 'not signed in'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  select * into target from public.sessions
   where id = target_session_id and published for update;
  if not found then raise exception 'session not found'; end if;
  if not private.has_event_role(target.event_id, array['owner', 'admin', 'attendee']) then
    raise exception 'active event membership required';
  end if;
  select * into target_event from public.events where id = target.event_id;
  if target_event.lifecycle <> 'published' or target_event.suspended_at is not null then
    raise exception 'event schedule is read-only';
  end if;
  select exists (
    select 1 from public.my_flow_bookmarks
     where event_id = target.event_id and user_id = actor and session_id = target.id
  ) into already_bookmarked;
  if already_bookmarked then
    delete from public.my_flow_bookmarks
     where event_id = target.event_id and user_id = actor and session_id = target.id;
    return jsonb_build_object('bookmarked', false, 'conflicts', '[]'::jsonb);
  end if;
  if target.status = 'finished' or target.status_override = 'finished'
     or (target.status_override is null and now() >= target.end_time) then
    raise exception 'finished sessions cannot be added to My Flow';
  end if;
  insert into public.my_flow_bookmarks (event_id, user_id, session_id)
  values (target.event_id, actor, target.id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sessions.id, 'title', sessions.title,
    'start_time', sessions.start_time, 'end_time', sessions.end_time,
    'room', sessions.room
  ) order by sessions.start_time, sessions.end_time, sessions.id), '[]'::jsonb)
    into conflicts
    from public.my_flow_bookmarks as bookmarks
    join public.sessions as sessions
      on sessions.event_id = bookmarks.event_id and sessions.id = bookmarks.session_id
   where bookmarks.event_id = target.event_id
     and bookmarks.user_id = actor
     and bookmarks.session_id <> target.id
     and sessions.published
     and ((sessions.status_override is not null and sessions.status_override <> 'finished')
       or (sessions.status_override is null and now() < sessions.end_time))
     and sessions.start_time < target.end_time
     and sessions.end_time > target.start_time;
  return jsonb_build_object('bookmarked', true, 'conflicts', conflicts);
end;
$$;

create or replace function public.claim_session_seat(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  target_event public.events%rowtype;
  conflicts jsonb := '[]'::jsonb;
begin
  if actor is null then raise exception 'not signed in'; end if;
  select * into target from public.sessions
   where id = target_session_id and published for update;
  if not found then raise exception 'session not found'; end if;
  if not private.has_event_role(target.event_id, array['owner', 'admin', 'attendee']) then
    raise exception 'active event membership required';
  end if;
  select * into target_event from public.events where id = target.event_id;
  if target_event.lifecycle <> 'published' or target_event.suspended_at is not null then
    raise exception 'event schedule is read-only';
  end if;
  if target.capacity is null then raise exception 'session does not have seats'; end if;
  if exists (select 1 from public.session_seat_claims
      where session_id = target.id and user_id = actor) then
    return jsonb_build_object(
      'held', true, 'capacity', target.capacity,
      'taken', target.reserved_seats + target.claimed_seats,
      'seats_closed', target.seats_closed, 'conflicts', conflicts
    );
  end if;
  if target.seats_closed then raise exception 'seats are closed'; end if;
  if target.status = 'finished' or target.status_override = 'finished'
     or (target.status_override is null and now() >= target.end_time) then
    raise exception 'finished sessions cannot be claimed';
  end if;
  if target.reserved_seats + target.claimed_seats >= target.capacity then
    raise exception 'no seats left';
  end if;
  insert into public.session_seat_claims (session_id, user_id) values (target.id, actor);
  update public.sessions set claimed_seats = claimed_seats + 1 where id = target.id;
  insert into public.my_flow_bookmarks (event_id, user_id, session_id)
  values (target.event_id, actor, target.id) on conflict do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sessions.id, 'title', sessions.title,
    'start_time', sessions.start_time, 'end_time', sessions.end_time,
    'room', sessions.room
  ) order by sessions.start_time, sessions.end_time, sessions.id), '[]'::jsonb)
    into conflicts
    from public.my_flow_bookmarks as bookmarks
    join public.sessions as sessions
      on sessions.event_id = bookmarks.event_id and sessions.id = bookmarks.session_id
   where bookmarks.event_id = target.event_id
     and bookmarks.user_id = actor and bookmarks.session_id <> target.id
     and sessions.published
     and ((sessions.status_override is not null and sessions.status_override <> 'finished')
       or (sessions.status_override is null and now() < sessions.end_time))
     and sessions.start_time < target.end_time and sessions.end_time > target.start_time;
  return jsonb_build_object(
    'held', true, 'capacity', target.capacity,
    'taken', target.reserved_seats + target.claimed_seats + 1,
    'seats_closed', target.seats_closed, 'conflicts', conflicts
  );
end;
$$;

create or replace function public.release_session_seat(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  target_event public.events%rowtype;
  released boolean := false;
begin
  if actor is null then raise exception 'not signed in'; end if;
  select * into target from public.sessions where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  if not private.has_event_role(target.event_id, array['owner', 'admin', 'attendee']) then
    raise exception 'active event membership required';
  end if;
  select * into target_event from public.events where id = target.event_id;
  if target_event.lifecycle <> 'published' or target_event.suspended_at is not null then
    raise exception 'event schedule is read-only';
  end if;
  delete from public.session_seat_claims
   where session_id = target.id and user_id = actor;
  released := found;
  if released then
    update public.sessions set claimed_seats = greatest(claimed_seats - 1, 0)
     where id = target.id;
  end if;
  return jsonb_build_object(
    'held', false, 'capacity', target.capacity,
    'taken', target.reserved_seats + target.claimed_seats
      - (case when released then 1 else 0 end),
    'seats_closed', target.seats_closed, 'conflicts', '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_set_session_capacity(
  target_session_id uuid,
  session_capacity integer,
  session_reserved_seats integer,
  session_seats_closed boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  next_reserved integer := coalesce(session_reserved_seats, 0);
  next_closed boolean := coalesce(session_seats_closed, false);
  replay public.event_audit_log%rowtype;
begin
  select * into current_session from public.sessions
   where id = target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(
    current_session.event_id, 'session.capacity', mutation_request_id, target_session_id
  );
  if replay.id is not null then return target_session_id; end if;
  actor_membership_id := private.current_event_membership_id(
    current_session.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(current_session.event_id) then
    raise exception 'event staff access required';
  end if;
  select * into target_event from public.events
   where id = current_session.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  if session_capacity is null then
    if current_session.claimed_seats > 0 then
      raise exception
        'cannot remove the seat limit while % attendee seats are held; close seats instead',
        current_session.claimed_seats;
    end if;
    update public.sessions
       set capacity = null, reserved_seats = 0, claimed_seats = 0, seats_closed = false
     where id = target_session_id;
  else
    if session_capacity <= 0 then raise exception 'capacity must be greater than zero'; end if;
    if next_reserved < 0 then raise exception 'reserved seats cannot be negative'; end if;
    if next_reserved + current_session.claimed_seats > session_capacity then
      raise exception
        'capacity must be at least % to cover % reserved and % attendee seats',
        next_reserved + current_session.claimed_seats,
        next_reserved, current_session.claimed_seats;
    end if;
    update public.sessions
       set capacity = session_capacity, reserved_seats = next_reserved,
           seats_closed = next_closed
     where id = target_session_id;
  end if;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    current_session.event_id, actor, actor_membership_id, 'session.capacity',
    'session', target_session_id,
    jsonb_build_object(
      'title', current_session.title,
      'capacity', session_capacity,
      'reserved_seats', case when session_capacity is null then 0 else next_reserved end,
      'seats_closed', case when session_capacity is null then false else next_closed end
    ), mutation_request_id
  );
  return target_session_id;
end;
$$;

create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
set search_path = ''
as $$
declare
  flipped record;
begin
  for flipped in
    select sessions.id,
      case when now() < sessions.start_time then 'not_started'
           when now() >= sessions.end_time then 'finished' else 'ongoing' end as new_status
      from public.sessions as sessions
      join public.events as events on events.id = sessions.event_id
     where events.lifecycle = 'published'
       and events.suspended_at is null
       and sessions.published
       and sessions.status_override is null
       and sessions.status is distinct from (
         case when now() < sessions.start_time then 'not_started'
              when now() >= sessions.end_time then 'finished' else 'ongoing' end
       )
     order by sessions.id for update of sessions skip locked
  loop
    update public.sessions set status = flipped.new_status where id = flipped.id;
    if flipped.new_status = 'finished' then
      delete from public.my_flow_bookmarks where session_id = flipped.id;
    end if;
  end loop;
  delete from public.my_flow_bookmarks as bookmarks
   using public.sessions as sessions, public.events as events
   where sessions.id = bookmarks.session_id
     and events.id = sessions.event_id
     and events.lifecycle = 'published'
     and events.suspended_at is null
     and sessions.status = 'finished';
  update public.events
     set status = calculated.new_status
    from (
      select id, case when now() < starts_at then 'upcoming'
        when now() >= ends_at then 'ended' else 'started' end as new_status
        from public.events
       where lifecycle = 'published' and suspended_at is null
    ) as calculated
   where events.id = calculated.id
     and events.status is distinct from calculated.new_status;
end;
$$;

revoke all on function public.admin_create_session(
  uuid, text, text, text, timestamptz, timestamptz, boolean, uuid
) from public, anon;
revoke all on function public.admin_update_session(
  uuid, text, text, text, timestamptz, timestamptz, uuid
) from public, anon;
revoke all on function public.admin_set_session_published(uuid, boolean, uuid)
  from public, anon;
revoke all on function public.admin_delete_session(uuid, uuid) from public, anon;
revoke all on function public.admin_create_speaker(
  uuid, text, text, text, text, text, text, boolean, uuid
) from public, anon;
revoke all on function public.admin_update_speaker(
  uuid, text, text, text, text, text, text, uuid
) from public, anon;
revoke all on function public.admin_set_speaker_published(uuid, boolean, uuid)
  from public, anon;
revoke all on function public.admin_delete_speaker(uuid, uuid) from public, anon;
revoke all on function public.admin_set_session_speakers(uuid, uuid[], uuid)
  from public, anon;
revoke all on function public.admin_set_session_status(uuid, text, boolean, uuid)
  from public, anon;
revoke all on function public.admin_set_session_capacity(
  uuid, integer, integer, boolean, uuid
) from public, anon;
revoke all on function public.toggle_my_flow_bookmark(uuid) from public, anon;
revoke all on function public.claim_session_seat(uuid) from public, anon;
revoke all on function public.release_session_seat(uuid) from public, anon;
revoke all on function public.sync_program_flow_statuses()
  from public, anon, authenticated;

grant execute on function public.admin_create_session(
  uuid, text, text, text, timestamptz, timestamptz, boolean, uuid
) to authenticated;
grant execute on function public.admin_update_session(
  uuid, text, text, text, timestamptz, timestamptz, uuid
) to authenticated;
grant execute on function public.admin_set_session_published(uuid, boolean, uuid)
  to authenticated;
grant execute on function public.admin_delete_session(uuid, uuid) to authenticated;
grant execute on function public.admin_create_speaker(
  uuid, text, text, text, text, text, text, boolean, uuid
) to authenticated;
grant execute on function public.admin_update_speaker(
  uuid, text, text, text, text, text, text, uuid
) to authenticated;
grant execute on function public.admin_set_speaker_published(uuid, boolean, uuid)
  to authenticated;
grant execute on function public.admin_delete_speaker(uuid, uuid) to authenticated;
grant execute on function public.admin_set_session_speakers(uuid, uuid[], uuid)
  to authenticated;
grant execute on function public.admin_set_session_status(uuid, text, boolean, uuid)
  to authenticated;
grant execute on function public.admin_set_session_capacity(
  uuid, integer, integer, boolean, uuid
) to authenticated;
grant execute on function public.toggle_my_flow_bookmark(uuid) to authenticated;
grant execute on function public.claim_session_seat(uuid) to authenticated;
grant execute on function public.release_session_seat(uuid) to authenticated;

commit;
