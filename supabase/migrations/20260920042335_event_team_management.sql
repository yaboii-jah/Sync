-- Team management UI support: invitation preview and bounded transactional-email delivery.
begin;

create table public.event_admin_invitation_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invitation_id uuid not null references public.event_admin_invitations (id) on delete cascade,
  requested_by_user_id uuid not null references auth.users (id) on delete restrict,
  request_id uuid not null unique,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint event_admin_invitation_email_deliveries_completion_check check (
    (status = 'pending' and completed_at is null and provider_message_id is null and failure_code is null)
    or (status = 'sent' and completed_at is not null and provider_message_id is not null and failure_code is null)
    or (status = 'failed' and completed_at is not null and provider_message_id is null and failure_code is not null)
  )
);

create index event_admin_invitation_email_deliveries_event_created_idx
  on public.event_admin_invitation_email_deliveries (event_id, created_at desc);
create index event_admin_invitation_email_deliveries_created_idx
  on public.event_admin_invitation_email_deliveries (created_at desc);

alter table public.event_admin_invitation_email_deliveries enable row level security;
revoke all on table public.event_admin_invitation_email_deliveries from public, anon, authenticated;

create or replace function public.get_event_admin_invitation_preview(
  invitation_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  invitation public.event_admin_invitations%rowtype;
  target_event public.events%rowtype;
begin
  if actor is null or invitation_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select lower(btrim(email)) into actor_email
    from auth.users
   where id = actor and email_confirmed_at is not null;
  if actor_email is null then return jsonb_build_object('status', 'wrong_account'); end if;

  select * into invitation
    from public.event_admin_invitations
   where token_hash = invitation_token_hash;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if actor_email <> invitation.email then return jsonb_build_object('status', 'wrong_account'); end if;
  if invitation.revoked_at is not null then return jsonb_build_object('status', 'revoked'); end if;
  if invitation.expires_at <= now() then return jsonb_build_object('status', 'expired'); end if;

  select * into target_event from public.events where id = invitation.event_id;
  if not found or target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if invitation.accepted_at is not null then
    if exists (
      select 1 from public.event_memberships
       where id = invitation.accepted_by_membership_id and user_id = actor
    ) then return jsonb_build_object('status', 'accepted', 'slug', target_event.slug); end if;
    return jsonb_build_object('status', 'invalid');
  end if;

  return jsonb_build_object(
    'status', 'valid', 'name', target_event.name, 'slug', target_event.slug,
    'expires_at', invitation.expires_at
  );
end;
$$;

create or replace function public.reserve_event_admin_invitation_email(
  target_invitation_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  invitation public.event_admin_invitations%rowtype;
  actor_membership_id uuid;
  delivery_id uuid;
  utc_day timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  if actor is null then raise exception 'authentication required'; end if;
  if mutation_request_id is null then raise exception 'valid request id is required'; end if;
  select id into delivery_id from public.event_admin_invitation_email_deliveries where request_id = mutation_request_id;
  if found then
    if exists (
      select 1 from public.event_admin_invitation_email_deliveries
       where id = delivery_id and requested_by_user_id = actor
    ) then return delivery_id; end if;
    raise exception 'request id was already used for another mutation';
  end if;

  select * into invitation from public.event_admin_invitations where id = target_invitation_id for update;
  if not found then raise exception 'invitation not found'; end if;
  actor_membership_id := private.current_event_membership_id(invitation.event_id, array['owner']);
  if actor_membership_id is null then raise exception 'event owner access required'; end if;
  if invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at <= now() then
    raise exception 'a pending invitation is required';
  end if;
  if not exists (
    select 1 from public.events
     where id = invitation.event_id and lifecycle <> 'archived' and suspended_at is null
  ) then raise exception 'event administration is read-only'; end if;

  perform pg_advisory_xact_lock(hashtextextended('event_admin_invitation_email:' || utc_day::text, 0));
  if (select count(*) from public.event_admin_invitation_email_deliveries where created_at >= utc_day) >= 80 then
    raise exception 'platform invitation email limit reached';
  end if;
  if (select count(*) from public.event_admin_invitation_email_deliveries where event_id = invitation.event_id and created_at >= utc_day) >= 10 then
    raise exception 'event invitation email limit reached';
  end if;

  insert into public.event_admin_invitation_email_deliveries (
    event_id, invitation_id, requested_by_user_id, request_id
  ) values (
    invitation.event_id, invitation.id, actor, mutation_request_id
  ) returning id into delivery_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    invitation.event_id, actor, actor_membership_id, 'admin_invitation.email_requested',
    'event_admin_invitation', invitation.id, jsonb_build_object('delivery_id', delivery_id), mutation_request_id
  );
  return delivery_id;
end;
$$;

create or replace function public.complete_event_admin_invitation_email(
  target_delivery_id uuid,
  was_sent boolean,
  provider_message_id text,
  failure_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  delivery public.event_admin_invitation_email_deliveries%rowtype;
begin
  if actor is null then raise exception 'authentication required'; end if;
  select * into delivery from public.event_admin_invitation_email_deliveries where id = target_delivery_id for update;
  if not found or delivery.requested_by_user_id <> actor then raise exception 'delivery not found'; end if;
  if delivery.status <> 'pending' then return; end if;
  if was_sent then
    if nullif(btrim(coalesce(provider_message_id, '')), '') is null then raise exception 'provider message id is required'; end if;
    update public.event_admin_invitation_email_deliveries
       set status = 'sent', provider_message_id = btrim(provider_message_id), completed_at = now()
     where id = delivery.id;
  else
    update public.event_admin_invitation_email_deliveries
       set status = 'failed', failure_code = left(coalesce(nullif(btrim(failure_code), ''), 'provider_error'), 120), completed_at = now()
     where id = delivery.id;
  end if;
end;
$$;

revoke all on function public.get_event_admin_invitation_preview(text) from public, anon, authenticated;
revoke all on function public.reserve_event_admin_invitation_email(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_event_admin_invitation_email(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.get_event_admin_invitation_preview(text) to authenticated;
grant execute on function public.reserve_event_admin_invitation_email(uuid, uuid) to authenticated;
grant execute on function public.complete_event_admin_invitation_email(uuid, boolean, text, text) to authenticated;

commit;
