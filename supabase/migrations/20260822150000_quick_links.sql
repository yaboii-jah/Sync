-- Quick links shown on the More page (event website, photo booth, ...).
-- Managed directly in the database like other content; read-only to clients.
-- Photo booth URL is a placeholder until organizers provide the real one.

create table public.quick_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  icon text,
  created_at timestamptz not null default now()
);

alter table public.quick_links enable row level security;

create policy "Authenticated users can view quick links"
  on public.quick_links for select to authenticated using (true);

insert into public.quick_links (label, url, icon)
values
  ('Event Website', 'https://www.aws-scd.cloud/', 'globe'),
  ('Photo Booth', 'https://www.aws-scd.cloud/', 'camera');
