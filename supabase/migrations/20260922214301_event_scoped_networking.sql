-- The legacy user-wide card remains for flag-off routes. Event cards never
-- inherit its publication state or its historical scan list.
create table public.event_networking_cards (
  event_id uuid not null,
  membership_id uuid not null,
  public_token uuid not null default gen_random_uuid(),
  template integer not null default 1 check (template in (1, 2, 3, 4)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, membership_id),
  unique (public_token),
  foreign key (event_id, membership_id)
    references public.event_memberships (event_id, id) on delete cascade
);
create index event_networking_cards_membership_idx on public.event_networking_cards (membership_id);
create trigger event_networking_cards_updated_at before update on public.event_networking_cards
  for each row execute function public.set_updated_at();

create table public.event_networking_card_links (
  event_id uuid not null,
  membership_id uuid not null,
  network text not null check (network in ('linkedin', 'instagram', 'facebook', 'github')),
  primary key (event_id, membership_id, network),
  foreign key (event_id, membership_id)
    references public.event_networking_cards (event_id, membership_id) on delete cascade
);
create index event_networking_card_links_membership_idx on public.event_networking_card_links (membership_id);

create table public.event_networking_scan_history (
  event_id uuid not null,
  scanner_membership_id uuid not null,
  scanned_membership_id uuid not null,
  scanned_at timestamptz not null default now(),
  primary key (event_id, scanner_membership_id, scanned_membership_id),
  check (scanner_membership_id <> scanned_membership_id),
  foreign key (event_id, scanner_membership_id)
    references public.event_memberships (event_id, id) on delete cascade,
  foreign key (event_id, scanned_membership_id)
    references public.event_memberships (event_id, id) on delete cascade
);
create index event_networking_scans_scanner_time_idx
  on public.event_networking_scan_history (event_id, scanner_membership_id, scanned_at desc);
create index event_networking_scans_target_idx
  on public.event_networking_scan_history (event_id, scanned_membership_id);

alter table public.event_networking_cards enable row level security;
alter table public.event_networking_card_links enable row level security;
alter table public.event_networking_scan_history enable row level security;
revoke all on public.event_networking_cards, public.event_networking_card_links,
  public.event_networking_scan_history from public, anon, authenticated;

-- Narrow RPCs avoid exposing the global social table or other members' cards.
create function private.networking_membership(target_event_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.event_memberships m
  join public.events e on e.id = m.event_id
  where m.event_id = target_event_id and m.user_id = (select auth.uid())
    and m.status = 'active' and e.suspended_at is null
    and e.lifecycle in ('published', 'archived')
  limit 1;
$$;
revoke all on function private.networking_membership(uuid) from public, anon, authenticated;
grant execute on function private.networking_membership(uuid) to authenticated;

create function public.get_my_event_networking_card(target_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_membership uuid; card public.event_networking_cards%rowtype;
begin
  actor_membership := private.networking_membership(target_event_id);
  if actor_membership is null then return null; end if;
  select * into card from public.event_networking_cards
    where event_id = target_event_id and membership_id = actor_membership;
  if not found then
    if exists (select 1 from public.events where id = target_event_id and lifecycle = 'archived') then
      return null;
    end if;
    insert into public.event_networking_cards(event_id, membership_id)
      values (target_event_id, actor_membership) on conflict (event_id, membership_id) do nothing;
    select * into card from public.event_networking_cards
      where event_id = target_event_id and membership_id = actor_membership;
  end if;
  return jsonb_build_object('token', card.public_token, 'template', card.template,
    'links', coalesce((select jsonb_object_agg(s.network, s.url)
      from public.event_networking_card_links l
      join public.event_memberships m on m.event_id = l.event_id and m.id = l.membership_id
      join public.social_profiles s on s.user_id = m.user_id and s.network = l.network
      where l.event_id = target_event_id and l.membership_id = actor_membership), '{}'::jsonb),
    'available', coalesce((select jsonb_object_agg(s.network, s.url)
      from public.social_profiles s where s.user_id = (select auth.uid())), '{}'::jsonb));
end $$;

create function public.save_event_networking_card(target_event_id uuid, selected_networks text[], selected_template integer)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_membership uuid; network_count integer;
begin
  actor_membership := private.networking_membership(target_event_id);
  if actor_membership is null or not exists
    (select 1 from public.events where id = target_event_id and lifecycle = 'published') then
    raise exception 'active published event membership required';
  end if;
  if selected_template not in (1, 2, 3, 4) or selected_template is null
     or selected_networks is null then raise exception 'invalid card selection'; end if;
  select count(distinct n)::integer into network_count from unnest(selected_networks) n;
  if cardinality(selected_networks) > 4 or network_count <> cardinality(selected_networks)
    or exists (select 1 from unnest(selected_networks) n where n is null or n not in
      ('linkedin', 'instagram', 'facebook', 'github'))
    or exists (select 1 from unnest(selected_networks) n where not exists
      (select 1 from public.social_profiles s where s.user_id = (select auth.uid()) and s.network = n)) then
    raise exception 'invalid card selection';
  end if;
  insert into public.event_networking_cards(event_id, membership_id, template)
    values (target_event_id, actor_membership, selected_template)
    on conflict (event_id, membership_id) do update set template = excluded.template;
  delete from public.event_networking_card_links
    where event_id = target_event_id and membership_id = actor_membership;
  insert into public.event_networking_card_links(event_id, membership_id, network)
    select target_event_id, actor_membership, n from unnest(selected_networks) n;
end $$;

create function public.get_event_networking_card(target_event_id uuid, card_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if private.networking_membership(target_event_id) is null then return null; end if;
  select jsonb_build_object('name', p.name, 'photo_url', p.photo_url,
    'template', c.template, 'links', jsonb_object_agg(s.network, s.url))
    into result
    from public.event_networking_cards c
    join public.event_memberships m on m.event_id = c.event_id and m.id = c.membership_id
    join public.profiles p on p.id = m.user_id
    join public.event_networking_card_links l on l.event_id = c.event_id and l.membership_id = c.membership_id
    join public.social_profiles s on s.user_id = m.user_id and s.network = l.network
   where c.event_id = target_event_id and c.public_token = card_token and m.status = 'active'
   group by p.name, p.photo_url, c.template;
  return result;
end $$;

create function public.record_event_networking_scan(target_event_id uuid, card_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare scanner uuid; target uuid;
begin
  scanner := private.networking_membership(target_event_id);
  if scanner is null or not exists
    (select 1 from public.events where id = target_event_id and lifecycle = 'published') then return; end if;
  select c.membership_id into target from public.event_networking_cards c
    join public.event_memberships m on m.event_id = c.event_id and m.id = c.membership_id
   where c.event_id = target_event_id and c.public_token = card_token
     and m.status = 'active' and c.membership_id <> scanner
     and exists (select 1 from public.event_networking_card_links l
       join public.social_profiles s on s.user_id = m.user_id and s.network = l.network
       where l.event_id = c.event_id and l.membership_id = c.membership_id);
  if target is null then return; end if;
  insert into public.event_networking_scan_history(event_id, scanner_membership_id, scanned_membership_id)
    values (target_event_id, scanner, target)
    on conflict (event_id, scanner_membership_id, scanned_membership_id)
    do update set scanned_at = now();
end $$;

create function public.get_my_event_networking_scans(target_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, m.display_name_snapshot),
    'photo_url', p.photo_url, 'token', c.public_token, 'scanned_at', h.scanned_at)
    order by h.scanned_at desc), '[]'::jsonb)
  from public.event_networking_scan_history h
  join public.event_memberships m on m.event_id = h.event_id and m.id = h.scanned_membership_id
  left join public.profiles p on p.id = m.user_id
  left join public.event_networking_cards c on c.event_id = m.event_id and c.membership_id = m.id
  where h.event_id = target_event_id and h.scanner_membership_id = private.networking_membership(target_event_id);
$$;

revoke all on function public.get_my_event_networking_card(uuid),
  public.save_event_networking_card(uuid, text[], integer),
  public.get_event_networking_card(uuid, uuid), public.record_event_networking_scan(uuid, uuid),
  public.get_my_event_networking_scans(uuid) from public, anon;
grant execute on function public.get_my_event_networking_card(uuid),
  public.save_event_networking_card(uuid, text[], integer),
  public.get_event_networking_card(uuid, uuid), public.record_event_networking_scan(uuid, uuid),
  public.get_my_event_networking_scans(uuid) to authenticated;
