-- Keep the existing quick-link row but route the in-app booth through Next.js.
update public.quick_links
set url = '/more/photo-booth'
where label = 'Photo Booth'
  and icon = 'camera'
  and url = 'https://www.aws-scd.cloud/';
