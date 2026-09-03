-- The out-of-runner social_profiles recreation inherited default public-schema
-- grants. Restore the narrow table privileges from the canonical card model;
-- anonymous readers resolve published cards only through the token RPC.

revoke all on table public.networking_cards from anon, authenticated;

revoke all on table public.social_profiles from anon, authenticated;

grant select on table public.networking_cards to authenticated;

grant select on table public.social_profiles to authenticated;
