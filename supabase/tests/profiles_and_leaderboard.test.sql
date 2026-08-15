-- Profiles, the privilege-escalation guard, and what the public leaderboard
-- does and does not publish.

begin;
select plan(20);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

-- ── a profile is visible only to its owner ────────────────────────────────
select is(
  (select count(*)::int from public.profiles),
  1,
  'Cass sees exactly one profile — her own'
);

select is(
  (select username from public.profiles),
  'Cass Ferreira',
  'and it is hers'
);

-- ── the escalation guard ──────────────────────────────────────────────────
-- The most important assertion in this file. `authenticated` holds UPDATE on
-- username and leaderboard_opt_in and on no other column, so the attempt is
-- refused by column privilege before RLS is consulted at all. An UPDATE policy
-- could not express this: `with check` cannot see the old value, so it has no
-- way to say "this row, but not this column".
select throws_ok(
  $$update public.profiles set role = 'admin'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'an enthusiast cannot promote themselves to admin'
);

select is(
  (select role::text from public.profiles),
  'enthusiast',
  'and their role is unchanged'
);

-- ── another member's profile is out of reach ──────────────────────────────
select lives_ok(
  $$update public.profiles set username = 'hijacked'
    where id = '22222222-2222-4222-8222-222222222222'$$,
  'an update of somebody else''s profile is accepted without error'
);

reset role;

select is(
  (select username from public.profiles
   where id = '22222222-2222-4222-8222-222222222222'),
  'Priya Raghavan',
  'but it matched no rows — Priya''s name is untouched'
);

-- ── the leaderboard, as a signed-out visitor ──────────────────────────────
set local role anon;

select is(
  (select count(*)::int from public.public_leaderboard),
  16,
  'a signed-out visitor reads the board: every opted-in member with rides'
);

-- Cass is opted out in the seed. Her 36 credits stay private.
select is(
  (select count(*)::int from public.public_leaderboard
   where display_name = 'Cass Ferreira'),
  0,
  'an opted-out member does not appear, however many credits they have'
);

-- Bea is opted IN and has ridden nothing. The view joins through `ride`, so
-- opting in is necessary and not sufficient — this is the row that says so.
select is(
  (select count(*)::int from public.public_leaderboard
   where display_name = 'brand_new_bea'),
  0,
  'and an opted-in member with no rides does not appear either'
);

-- The assertion that catches a future `select *` quietly publishing a column.
select set_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'public_leaderboard'$$,
  array['display_name', 'credit_count'],
  'the board exposes exactly display_name and credit_count'
);

-- PostgREST lets a caller filter on any exposed column, so an id here would
-- turn the board into a per-user lookup.
select is(
  (select count(*)::int from information_schema.columns
   where table_schema = 'public' and table_name = 'public_leaderboard'
     and column_name in ('id', 'user_id', 'coaster_id')),
  0,
  'and exposes no filterable identifier'
);

-- ── what an owner may change ──────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$update public.profiles set username = 'Cass F'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  'an owner may change their own display name'
);

select lives_ok(
  $$update public.profiles set leaderboard_opt_in = true
    where id = '11111111-1111-4111-8111-111111111111'$$,
  'and may opt into the leaderboard'
);

-- Opting in is the whole mechanism: nothing else changed, and the board grew.
select is(
  (select count(*)::int from public.public_leaderboard),
  17,
  'and that single switch is what puts them on the board'
);

-- ── display-name availability ─────────────────────────────────────────────
-- The signup form needs this before a session exists, so anon must be able to
-- call it, and it must agree with the unique constraint exactly.

reset role;
set local role anon;

select is(
  (select public.username_available('Nobody At All')),
  true,
  'a free name is reported as available'
);

select is(
  (select public.username_available('  Priya Raghavan  ')),
  false,
  'the check trims, because handle_new_user trims before inserting'
);

select is(
  (select public.username_available('priya raghavan')),
  true,
  'the comparison is case-sensitive, matching the unique constraint'
);

select ok(
  has_function_privilege('anon', 'public.username_available(text)', 'execute'),
  'anon can execute it — the signup form calls it before any session exists'
);

-- The rest needs to read profiles, which anon deliberately cannot do. That the
-- four assertions above worked *without* that access is the point: the function
-- crosses the boundary, the caller does not.
reset role;

-- Self-referential rather than naming a seeded user: assertions earlier in this
-- transaction rename one, and a test that depends on data an earlier test
-- mutated fails for the wrong reason.
select is(
  (select count(*)::int from public.profiles p where public.username_available(p.username)),
  0,
  'every name currently in profiles reports as taken'
);

-- The property that makes the check worth having: "available" has to mean
-- "will insert". That only holds because the column is unique and the function
-- compares the same way it does.
select is(
  (select count(*)::int
   from pg_constraint c
   join pg_class t on t.oid = c.conrelid
   join pg_namespace n on n.oid = t.relnamespace
   join pg_attribute a on a.attrelid = t.oid and a.attnum = any (c.conkey)
   where n.nspname = 'public'
     and t.relname = 'profiles'
     and c.contype = 'u'
     and a.attname = 'username'),
  1,
  'profiles.username carries the unique constraint the check mirrors'
);

select * from finish();
rollback;
