-- Platform event members may use Google or an email magic link. The legacy
-- save_social_profiles RPC remains Google-only for flag-off compatibility.
create function public.save_event_reusable_social_links(
  target_event_id uuid,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  github_url text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  previous_template integer;
begin
  if actor is null or private.networking_membership(target_event_id) is null
    or not exists (select 1 from public.events where id = target_event_id and lifecycle = 'published') then
    raise exception 'active published event membership required';
  end if;
  previous_template := coalesce((select templates from public.social_profiles where user_id = actor limit 1), 1);
  delete from public.event_networking_card_links l using public.event_memberships m
   where l.event_id = m.event_id and l.membership_id = m.id and m.user_id = actor
     and ((l.network = 'linkedin' and nullif(linkedin_url, '') is null)
       or (l.network = 'instagram' and nullif(instagram_url, '') is null)
       or (l.network = 'facebook' and nullif(facebook_url, '') is null)
       or (l.network = 'github' and nullif(github_url, '') is null));
  delete from public.social_profiles where user_id = actor;
  insert into public.social_profiles(user_id, network, url, templates)
    select actor, vals.network, vals.url, previous_template from (values
      ('linkedin', nullif(linkedin_url, '')),
      ('instagram', nullif(instagram_url, '')),
      ('facebook', nullif(facebook_url, '')),
      ('github', nullif(github_url, ''))
    ) vals(network, url) where vals.url is not null;
  update public.networking_cards set is_public = exists
    (select 1 from public.social_profiles where user_id = actor)
    where user_id = actor;
end $$;
revoke all on function public.save_event_reusable_social_links(uuid,text,text,text,text) from public,anon;
grant execute on function public.save_event_reusable_social_links(uuid,text,text,text,text) to authenticated;
