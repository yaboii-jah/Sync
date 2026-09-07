-- Each attendee owns a compact, deduplicated history of the public networking
-- cards they opened. There is no event-wide scan feed and no backfill.
create table public.networking_scan_history (
  scanner_id uuid not null references public.profiles(id) on delete cascade,
  scanned_user_id uuid not null references public.profiles(id) on delete cascade,
  card_path text not null,
  scanned_at timestamptz not null default now(),
  primary key (scanner_id, scanned_user_id),
  constraint networking_scan_history_no_self_scan
    check (scanner_id <> scanned_user_id),
  constraint networking_scan_history_card_path_check
    check (card_path ~ '^/c/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

-- The owner history query filters and orders by these columns. The separate
-- target index also keeps profile deletion cascades from scanning this table.
create index networking_scan_history_scanner_scanned_at_idx
  on public.networking_scan_history (scanner_id, scanned_at desc);

create index networking_scan_history_scanned_user_id_idx
  on public.networking_scan_history (scanned_user_id);

alter table public.networking_scan_history enable row level security;

revoke all on table public.networking_scan_history from public, anon, authenticated;

create function public.record_networking_card_scan(card_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  scanned_card record;
begin
  if caller_id is null then
    return;
  end if;

  if not exists (
    select 1
      from public.profiles
     where profiles.id = caller_id
  ) then
    return;
  end if;

  select cards.user_id, cards.public_token
    into scanned_card
    from public.networking_cards as cards
   where cards.public_token = card_token
     and cards.is_public;

  -- Preserve the public card route's indistinguishable unavailable state and
  -- never record an attendee previewing their own card.
  if not found or scanned_card.user_id = caller_id then
    return;
  end if;

  insert into public.networking_scan_history (
    scanner_id,
    scanned_user_id,
    card_path,
    scanned_at
  )
  values (
    caller_id,
    scanned_card.user_id,
    '/c/' || scanned_card.public_token::text,
    now()
  )
  on conflict (scanner_id, scanned_user_id) do update
    set card_path = excluded.card_path,
        scanned_at = excluded.scanned_at;
end;
$$;

create function public.get_my_networking_scan_history()
returns table (
  name text,
  photo_url text,
  card_path text,
  scanned_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.name,
         profiles.photo_url,
         history.card_path,
         history.scanned_at
    from public.networking_scan_history as history
    join public.profiles as profiles
      on profiles.id = history.scanned_user_id
   where history.scanner_id = (select auth.uid())
   order by history.scanned_at desc;
$$;

revoke all on function public.record_networking_card_scan(uuid) from public, anon;
grant execute on function public.record_networking_card_scan(uuid) to authenticated;

revoke all on function public.get_my_networking_scan_history() from public, anon;
grant execute on function public.get_my_networking_scan_history() to authenticated;
