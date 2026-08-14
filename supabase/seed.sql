-- Deterministic seed data.
--
-- Fixed UUIDs, fixed dates, no random(), no now() in any value that a test
-- asserts on. Replayed by `supabase db reset` after the migrations.
--
-- The shape matters as much as the contents. Three properties are load-bearing
-- and any future edit has to keep them:
--
--   62 rides across only 36 distinct coasters. Credits and rides must disagree,
--   or the dashboard demonstrates nothing.
--
--   "Icon" and "ICON" at Blackpool Pleasure Beach. The catalogue's duplicate
--   filter exists to surface exactly this pair.
--
--   One enthusiast opted into the leaderboard and one opted out, plus an admin
--   who owns no rides at all.
--
-- The passwords below are local development credentials for a stack that only
-- listens on 127.0.0.1. They are not secrets and must never be reused anywhere
-- that is reachable.

-- ── helper ─────────────────────────────────────────────────────────────────
-- Creates an auth identity the way GoTrue expects: a users row plus the
-- matching identities row, without which password sign-in fails. pg_temp keeps
-- it session-local, so it never becomes part of the schema.

create or replace function pg_temp.seed_user(
  p_id           uuid,
  p_email        text,
  p_password     text,
  p_display_name text
) returns void
language plpgsql
as $fn$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', p_display_name),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email), 'email',
    now(), now(), now()
  );
end;
$fn$;

-- ── people ─────────────────────────────────────────────────────────────────
-- The profile rows are created by the on_auth_user_created trigger, which is
-- the same path a real signup takes — so the seed exercises it rather than
-- working around it. Role and opt-in are adjusted afterwards, because the
-- trigger deliberately ignores both: a signup payload is client-controlled.

select pg_temp.seed_user('11111111-1111-4111-8111-111111111111', 'cass@example.com',    'credit-count-dev', 'Cass Ferreira');
select pg_temp.seed_user('22222222-2222-4222-8222-222222222222', 'priya@example.com',   'credit-count-dev', 'Priya Raghavan');
select pg_temp.seed_user('33333333-3333-4333-8333-333333333333', 'rowan@example.com',   'credit-count-dev', 'Rowan Selby');

-- Board filler, so the leaderboard reads like a leaderboard rather than a list
-- of one. All opted in, all with deterministic ride sets assigned below.
select pg_temp.seed_user('44444444-4444-4444-8444-444444444444', 'wendy@example.com',   'credit-count-dev', 'woodie_wendy');
select pg_temp.seed_user('55555555-5555-4555-8555-555555555555', 'annie@example.com',   'credit-count-dev', 'Airtime Annie');
select pg_temp.seed_user('66666666-6666-4666-8666-666666666666', 'gus@example.com',     'credit-count-dev', 'gravity_gus');
select pg_temp.seed_user('77777777-7777-4777-8777-777777777777', 'marcus@example.com',  'credit-count-dev', 'Marcus Odell');
select pg_temp.seed_user('88888888-8888-4888-8888-888888888888', 'ines@example.com',    'credit-count-dev', 'inversion_ines');

-- Rowan manages the catalogue and has no ride history. This is the row that
-- makes "an admin can read nothing in ride" testable against a real session.
update public.profiles set role = 'admin' where id = '33333333-3333-4333-8333-333333333333';

-- Cass is opted OUT: the dashboard's default state, and what puts the "You are
-- not listed" nudge on the leaderboard. Everyone else is opted in.
update public.profiles set leaderboard_opt_in = true
where id <> '11111111-1111-4111-8111-111111111111'
  and role = 'enthusiast';

-- ── catalogue ──────────────────────────────────────────────────────────────
-- Slugs are the join key for the ride block below and do not survive into the
-- database; ids are derived from the ordinal so they are stable across resets.

create temporary table coaster_seed (
  ord int, slug text, name text, park text, country text, manufacturer text, type text
) on commit drop;

insert into coaster_seed (ord, slug, name, park, country, manufacturer, type) values
  (1, 'nemesis', 'Nemesis', 'Alton Towers', 'United Kingdom', 'Bolliger & Mabillard', 'Steel'),
  (2, 'wickerman', 'Wicker Man', 'Alton Towers', 'United Kingdom', 'Great Coasters International', 'Wooden'),
  (3, 'smiler', 'The Smiler', 'Alton Towers', 'United Kingdom', 'Gerstlauer', 'Steel'),
  (4, 'oblivion', 'Oblivion', 'Alton Towers', 'United Kingdom', 'Bolliger & Mabillard', 'Steel'),
  (5, 'icon', 'Icon', 'Blackpool Pleasure Beach', 'United Kingdom', 'Mack Rides', 'Steel'),
  (6, 'bigone', 'The Big One', 'Blackpool Pleasure Beach', 'United Kingdom', 'Arrow Dynamics', 'Steel'),
  (7, 'grandnational', 'Grand National', 'Blackpool Pleasure Beach', 'United Kingdom', 'Charles Paige', 'Wooden'),
  (8, 'iconalt', 'ICON', 'Blackpool Pleasure Beach', 'United Kingdom', 'Mack Rides', 'Steel'),
  (9, 'stealth', 'Stealth', 'Thorpe Park', 'United Kingdom', 'Intamin', 'Steel'),
  (10, 'inferno', 'Nemesis Inferno', 'Thorpe Park', 'United Kingdom', 'Bolliger & Mabillard', 'Steel'),
  (11, 'colossus', 'Colossus', 'Thorpe Park', 'United Kingdom', 'Intamin', 'Steel'),
  (12, 'megafobia', 'Megafobia', 'Oakwood Theme Park', 'United Kingdom', 'Custom Coasters International', 'Wooden'),
  (13, 'steelvengeance', 'Steel Vengeance', 'Cedar Point', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  (14, 'millenniumforce', 'Millennium Force', 'Cedar Point', 'United States', 'Intamin', 'Steel'),
  (15, 'maverick', 'Maverick', 'Cedar Point', 'United States', 'Intamin', 'Steel'),
  (16, 'topthrill2', 'Top Thrill 2', 'Cedar Point', 'United States', 'Zamperla', 'Steel'),
  (17, 'eltoro', 'El Toro', 'Six Flags Great Adventure', 'United States', 'Intamin', 'Wooden'),
  (18, 'fury325', 'Fury 325', 'Carowinds', 'United States', 'Bolliger & Mabillard', 'Steel'),
  (19, 'velocicoaster', 'VelociCoaster', 'Universal Islands of Adventure', 'United States', 'Intamin', 'Steel'),
  (20, 'irongwazi', 'Iron Gwazi', 'Busch Gardens Tampa Bay', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  (21, 'twistedcolossus', 'Twisted Colossus', 'Six Flags Magic Mountain', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  (22, 'x2', 'X2', 'Six Flags Magic Mountain', 'United States', 'Arrow Dynamics', 'Steel'),
  (23, 'voyage', 'The Voyage', 'Holiday World', 'United States', 'The Gravity Group', 'Wooden'),
  (24, 'phoenix', 'Phoenix', 'Knoebels', 'United States', 'Herbert Schmeck', 'Wooden'),
  (25, 'boulderdash', 'Boulder Dash', 'Lake Compounce', 'United States', 'Custom Coasters International', 'Wooden'),
  (26, 'taron', 'Taron', 'Phantasialand', 'Germany', 'Intamin', 'Steel'),
  (27, 'blackmamba', 'Black Mamba', 'Phantasialand', 'Germany', 'Bolliger & Mabillard', 'Steel'),
  (28, 'wodan', 'Wodan Timbur Coaster', 'Europa-Park', 'Germany', 'Great Coasters International', 'Wooden'),
  (29, 'bluefire', 'Blue Fire Megacoaster', 'Europa-Park', 'Germany', 'Mack Rides', 'Steel'),
  (30, 'silverstar', 'Silver Star', 'Europa-Park', 'Germany', 'Bolliger & Mabillard', 'Steel'),
  (31, 'karnan', 'Schwur des Kärnan', 'Hansa-Park', 'Germany', 'Gerstlauer', 'Steel'),
  (32, 'shambhala', 'Shambhala', 'PortAventura Park', 'Spain', 'Bolliger & Mabillard', 'Steel'),
  (33, 'redforce', 'Red Force', 'Ferrari Land', 'Spain', 'Intamin', 'Steel'),
  (34, 'dragonkhan', 'Dragon Khan', 'PortAventura Park', 'Spain', 'Bolliger & Mabillard', 'Steel'),
  (35, 'helix', 'Helix', 'Liseberg', 'Sweden', 'Mack Rides', 'Steel'),
  (36, 'balder', 'Balder', 'Liseberg', 'Sweden', 'Intamin', 'Wooden'),
  (37, 'valkyria', 'Valkyria', 'Liseberg', 'Sweden', 'Bolliger & Mabillard', 'Steel'),
  (38, 'baron1898', 'Baron 1898', 'Efteling', 'Netherlands', 'Bolliger & Mabillard', 'Steel'),
  (39, 'joris', 'Joris en de Draak', 'Efteling', 'Netherlands', 'Great Coasters International', 'Wooden'),
  (40, 'untamed', 'Untamed', 'Walibi Holland', 'Netherlands', 'Rocky Mountain Construction', 'Hybrid'),
  (41, 'piraten', 'Piraten', 'Djurs Sommerland', 'Denmark', 'Intamin', 'Steel'),
  (42, 'steeldragon', 'Steel Dragon 2000', 'Nagashima Spa Land', 'Japan', 'Morgan', 'Steel'),
  (43, 'eejanaika', 'Eejanaika', 'Fuji-Q Highland', 'Japan', 'S&S Worldwide', 'Steel'),
  (44, 'toutatis', 'Toutatis', 'Parc Astérix', 'France', 'Intamin', 'Steel'),
  (45, 'oziris', 'OzIris', 'Parc Astérix', 'France', 'Bolliger & Mabillard', 'Steel'),
  (46, 'leviathan', 'Leviathan', 'Canada''s Wonderland', 'Canada', 'Bolliger & Mabillard', 'Steel'),
  (47, 'yukonstriker', 'Yukon Striker', 'Canada''s Wonderland', 'Canada', 'Bolliger & Mabillard', 'Steel');

insert into public.coasters (id, name, park, country, manufacturer, type)
select
  ('c0a57e00-0000-4000-8000-' || lpad(ord::text, 12, '0'))::uuid,
  name, park, country, manufacturer, type::public.coaster_type
from coaster_seed
order by ord;

-- ── Cass's ride history ────────────────────────────────────────────────────
-- 62 rides over 2023-2026 touching 36 coasters. Nemesis appears seven times;
-- Valkyria exactly once, which is what makes "delete the last ride and lose the
-- credit" demonstrable.

create temporary table ride_seed (slug text, ridden_on date, note text) on commit drop;

insert into ride_seed (slug, ridden_on, note) values
  ('nemesis', '2023-05-20'::date, 'First credit. Front row, Forbidden Valley in the rain.'),
  ('oblivion', '2023-05-20'::date, null),
  ('stealth', '2023-06-24'::date, 'Nought to eighty in under two seconds.'),
  ('inferno', '2023-06-24'::date, null),
  ('colossus', '2023-06-24'::date, 'Ten inversions. Never again in the heat.'),
  ('nemesis', '2023-08-11'::date, null),
  ('wickerman', '2023-08-11'::date, null),
  ('smiler', '2023-08-12'::date, 'Fourteen inversions, one headache.'),
  ('shambhala', '2023-09-02'::date, 'Ninety metres over the Costa Daurada.'),
  ('dragonkhan', '2023-09-02'::date, null),
  ('icon', '2023-10-07'::date, 'First Mack multi-launch. Sold immediately.'),
  ('bigone', '2023-10-07'::date, 'Rattly, but the view over the Irish Sea is worth it.'),
  ('taron', '2024-03-16'::date, 'Klugheim in the mist. Best themed area anywhere.'),
  ('blackmamba', '2024-03-16'::date, null),
  ('taron', '2024-03-17'::date, null),
  ('nemesis', '2024-04-06'::date, 'Back row on the retrack — smoother than expected.'),
  ('icon', '2024-05-25'::date, null),
  ('grandnational', '2024-05-25'::date, 'Racing the other train the whole way. Lost.'),
  ('helix', '2024-06-29'::date, 'Seven inversions down a hillside.'),
  ('balder', '2024-06-29'::date, 'Wooden, but it rides like glass.'),
  ('stealth', '2024-07-13'::date, null),
  ('inferno', '2024-07-13'::date, 'Zero-G roll over the water.'),
  ('megafobia', '2024-08-03'::date, 'Worth the drive to Pembrokeshire.'),
  ('nemesis', '2024-09-14'::date, null),
  ('wickerman', '2024-09-14'::date, 'Night ride with the fire lit.'),
  ('wodan', '2024-11-02'::date, 'Third row, ejector over the turnaround.'),
  ('bluefire', '2024-11-02'::date, null),
  ('silverstar', '2024-11-03'::date, null),
  ('nemesis', '2025-03-29'::date, 'Season opener. Walk-on all afternoon.'),
  ('smiler', '2025-03-29'::date, null),
  ('baron1898', '2025-04-12'::date, 'The drop-track hold is pure theatre.'),
  ('joris', '2025-04-12'::date, 'Red train. Won the race.'),
  ('untamed', '2025-04-13'::date, 'RMC in a small park — not a wasted metre.'),
  ('icon', '2025-05-03'::date, 'Back row airtime over the second launch.'),
  ('bigone', '2025-05-03'::date, null),
  ('karnan', '2025-06-07'::date, 'Vertical lift, vertical drop, swing launch. Underrated.'),
  ('piraten', '2025-06-08'::date, null),
  ('nemesis', '2025-07-19'::date, null),
  ('oblivion', '2025-07-19'::date, 'Held on the brink for a full three seconds.'),
  ('shambhala', '2025-08-16'::date, null),
  ('redforce', '2025-08-16'::date, 'Fastest in Europe. Over in twenty seconds.'),
  ('steelvengeance', '2025-09-20'::date, 'Twenty-seven airtime moments. I counted.'),
  ('millenniumforce', '2025-09-20'::date, 'Overbanked turn at sunset.'),
  ('maverick', '2025-09-21'::date, null),
  ('eltoro', '2025-09-24'::date, 'Ejector on every hill. Legs bruised.'),
  ('fury325', '2025-09-27'::date, 'The treble out-and-back is relentless.'),
  ('velocicoaster', '2025-09-30'::date, 'Mosasaurus roll. No notes.'),
  ('irongwazi', '2025-10-01'::date, null),
  ('taron', '2025-10-25'::date, 'Night rides until close.'),
  ('blackmamba', '2025-10-25'::date, null),
  ('taron', '2026-02-21'::date, null),
  ('wodan', '2026-02-22'::date, null),
  ('bluefire', '2026-02-22'::date, 'The launch still hits.'),
  ('baron1898', '2026-03-28'::date, null),
  ('icon', '2026-04-18'::date, null),
  ('stealth', '2026-05-09'::date, null),
  ('toutatis', '2026-05-30'::date, 'Three launches and a proper Astérix pun.'),
  ('oziris', '2026-05-30'::date, null),
  ('nemesis', '2026-06-13'::date, 'Row four. Still the best.'),
  ('wickerman', '2026-06-13'::date, null),
  ('helix', '2026-07-04'::date, null),
  ('valkyria', '2026-07-04'::date, null);

insert into public.ride (user_id, coaster_id, ridden_on, note)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  ('c0a57e00-0000-4000-8000-' || lpad(cs.ord::text, 12, '0'))::uuid,
  rs.ridden_on,
  rs.note
from ride_seed rs
join coaster_seed cs on cs.slug = rs.slug;

-- ── everyone else's rides ──────────────────────────────────────────────────
-- Each takes the first N coasters, one ride apiece, on dates derived from the
-- ordinal. Nothing random, so the board's order is the same on every reset.

insert into public.ride (user_id, coaster_id, ridden_on, note)
select
  b.user_id,
  ('c0a57e00-0000-4000-8000-' || lpad(cs.ord::text, 12, '0'))::uuid,
  date '2025-01-05' + cs.ord,
  null
from (values
  ('44444444-4444-4444-8444-444444444444'::uuid, 30),
  ('55555555-5555-4555-8555-555555555555'::uuid, 24),
  ('66666666-6666-4666-8666-666666666666'::uuid, 19),
  ('77777777-7777-4777-8777-777777777777'::uuid, 14),
  ('22222222-2222-4222-8222-222222222222'::uuid, 12),
  ('88888888-8888-4888-8888-888888888888'::uuid,  9)
) as b(user_id, n)
join coaster_seed cs on cs.ord <= b.n;

-- ── assertions ─────────────────────────────────────────────────────────────
-- The seed fails loudly rather than quietly producing data the tests then
-- disagree with.

do $chk$
declare
  n_coasters int;
  n_rides    int;
  n_credits  int;
  n_dupes    int;
  n_board    int;
begin
  select count(*) into n_coasters from public.coasters;
  select count(*), count(distinct coaster_id)
    into n_rides, n_credits
    from public.ride
    where user_id = '11111111-1111-4111-8111-111111111111';
  select count(*) into n_dupes
    from public.coasters c
    where exists (
      select 1 from public.coasters o
      where o.id <> c.id
        and lower(o.name) = lower(c.name)
        and lower(o.park) = lower(c.park)
    );
  select count(*) into n_board from public.public_leaderboard;

  if n_coasters <> 47 then raise exception 'expected 47 coasters, got %', n_coasters; end if;
  if n_rides    <> 62 then raise exception 'expected 62 rides for Cass, got %', n_rides; end if;
  if n_credits  <> 36 then raise exception 'expected 36 credits for Cass, got %', n_credits; end if;
  if n_credits  >= n_rides then raise exception 'credits must stay below rides'; end if;
  if n_dupes    <> 2  then raise exception 'expected the Icon/ICON pair, got % duplicate rows', n_dupes; end if;
  if n_board    <> 6  then raise exception 'expected 6 opted-in members on the board, got %', n_board; end if;

  raise notice 'seed ok: % coasters, Cass % rides / % credits, % on the board',
    n_coasters, n_rides, n_credits, n_board;
end
$chk$;
