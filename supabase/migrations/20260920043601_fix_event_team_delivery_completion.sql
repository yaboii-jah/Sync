begin;

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
  select * into delivery from public.event_admin_invitation_email_deliveries
   where id = $1 for update;
  if not found or delivery.requested_by_user_id <> actor then raise exception 'delivery not found'; end if;
  if delivery.status <> 'pending' then return; end if;
  if $2 then
    if nullif(btrim(coalesce($3, '')), '') is null then raise exception 'provider message id is required'; end if;
    update public.event_admin_invitation_email_deliveries as deliveries
       set status = 'sent', provider_message_id = btrim($3), completed_at = now()
     where deliveries.id = delivery.id;
  else
    update public.event_admin_invitation_email_deliveries as deliveries
       set status = 'failed', failure_code = left(coalesce(nullif(btrim($4), ''), 'provider_error'), 120), completed_at = now()
     where deliveries.id = delivery.id;
  end if;
end;
$$;

revoke all on function public.complete_event_admin_invitation_email(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.complete_event_admin_invitation_email(uuid, boolean, text, text) to authenticated;

commit;
