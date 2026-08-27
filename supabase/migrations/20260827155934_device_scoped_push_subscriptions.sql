-- Identify push subscriptions by browser/PWA installation so disabling one
-- device does not turn off notifications on another device.

alter table public.push_subscriptions
  add column device_id text;

update public.push_subscriptions
   set device_id = gen_random_uuid()::text
 where device_id is null;

alter table public.push_subscriptions
  alter column device_id set default gen_random_uuid()::text,
  alter column device_id set not null;

alter table public.push_subscriptions
  add constraint push_subscriptions_device_id_check
  check (device_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

create unique index push_subscriptions_user_device_idx
  on public.push_subscriptions (user_id, device_id);
