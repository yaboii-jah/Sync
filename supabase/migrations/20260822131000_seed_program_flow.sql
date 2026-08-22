-- Placeholder seed for SCD Mega Manila 2026.
-- Real timeline/speaker content replaces this later via SQL; schema is final.
-- All timestamps are PHT (UTC+8): event runs 9:30 AM - 6:00 PM, Sep 11 2026.

insert into public.events (name, venue, starts_at, ends_at)
values (
  'SCD Mega Manila 2026',
  'Asia Pacific College',
  '2026-09-11 09:30:00+08',
  '2026-09-11 18:00:00+08'
);

with e as (
  select id from public.events where name = 'SCD Mega Manila 2026'
)
insert into public.sessions (event_id, title, description, room, start_time, end_time)
values
  ((select id from e), 'Registration & Welcome',
   'Check in, grab your badge, and settle in before the opening.',
   'Lobby', '2026-09-11 09:30:00+08', '2026-09-11 10:00:00+08'),
  ((select id from e), 'Opening Keynote',
   'Welcome to AWS Student Community Day Mega Manila — what the day holds and why it matters.',
   'Main Hall', '2026-09-11 10:00:00+08', '2026-09-11 10:45:00+08'),
  ((select id from e), 'Cloud 101 for Students',
   'A beginner-friendly tour of core AWS services and what to learn first.',
   'Room 201', '2026-09-11 11:00:00+08', '2026-09-11 11:45:00+08'),
  ((select id from e), 'Breaking into Tech',
   'Real stories on landing a first role — resumes, portfolios, and communities that help.',
   'Main Hall', '2026-09-11 13:00:00+08', '2026-09-11 13:45:00+08'),
  ((select id from e), 'Lunch Break',
   'Food stalls open at the grounds. Mingle with speakers and fellow attendees.',
   'Grounds', '2026-09-11 12:00:00+08', '2026-09-11 12:45:00+08'),
  ((select id from e), 'Panel: Careers in Cloud',
   'Practitioners answer everything about building a career in cloud computing.',
   'Main Hall', '2026-09-11 14:00:00+08', '2026-09-11 14:45:00+08'),
  ((select id from e), 'Serverless in Practice',
   'Building real projects on Lambda, API Gateway, and friends — lessons learned.',
   'Room 201', '2026-09-11 15:00:00+08', '2026-09-11 15:45:00+08'),
  ((select id from e), 'AI on AWS',
   'Getting hands-on with managed AI services without needing a PhD.',
   'Main Hall', '2026-09-11 16:00:00+08', '2026-09-11 16:45:00+08'),
  ((select id from e), 'Closing Remarks & Photo Booth',
   'Wrapping up the day, community announcements, and photos at the booth.',
   'Grounds', '2026-09-11 17:00:00+08', '2026-09-11 18:00:00+08');

insert into public.speakers_sponsors (name, role, organization, bio)
values
  ('Maria Santos', 'speaker', 'AWS Community Builder PH',
   'Cloud engineer and community builder who started with zero CS background.'),
  ('Juan Dela Cruz', 'speaker', 'TechStart Manila',
   'Full-stack developer sharing how he broke into tech through open source.'),
  ('Angela Reyes', 'host', 'AWS User Group Philippines',
   'Longtime community organizer and your host for the day.'),
  ('Paolo Mendoza', 'panelist', 'DataEnthusiasts PH',
   'Data engineer passionate about helping students find their niche.'),
  ('Kim Villanueva', 'panelist', 'AWS Cloud Club PUP',
   'Student leader who landed an internship through community events.'),
  ('Bea Lim', 'sponsor', 'TicketNation',
   'Representing TicketNation, this year''s registration partner.'),
  ('Carlo Garcia', 'speaker', 'Freelance Cloud Consultant',
   'Serverless specialist who builds production apps for local startups.'),
  ('Ina Torres', 'speaker', 'STI Global City',
   'Educator demystifying AI services for absolute beginners.');

with s as (select id, title from public.sessions),
     sp as (select id, name from public.speakers_sponsors)
insert into public.session_speakers (session_id, speaker_id)
select s.id, sp.id
from s join sp on true
where (s.title = 'Opening Keynote' and sp.name = 'Maria Santos')
   or (s.title = 'Breaking into Tech' and sp.name = 'Juan Dela Cruz')
   or (s.title = 'Panel: Careers in Cloud' and sp.name in ('Paolo Mendoza', 'Kim Villanueva'))
   or (s.title = 'Panel: Careers in Cloud' and sp.name = 'Angela Reyes')
   or (s.title = 'Serverless in Practice' and sp.name = 'Carlo Garcia')
   or (s.title = 'AI on AWS' and sp.name = 'Ina Torres');
