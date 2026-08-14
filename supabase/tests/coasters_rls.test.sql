-- Catalogue access: every signed-in user reads it, only admins change it, and a
-- signed-out visitor cannot reach it at all.

begin;
select plan(13);

set local role authenticated;

-- ── an enthusiast reads but cannot write ──────────────────────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.coasters),
  47,
  'an enthusiast reads the whole catalogue — credit counts are only comparable because everyone counts the same list'
);

select is(
  (select public.is_admin()),
  false,
  'is_admin() is false for an enthusiast'
);

select throws_ok(
  $$insert into public.coasters (name, park, country, manufacturer, type)
    values ('Forged', 'Somewhere', 'United Kingdom', 'RMC', 'Hybrid')$$,
  '42501',
  null,
  'an enthusiast cannot add a coaster'
);

select lives_ok(
  $$update public.coasters set name = 'Renamed' where name = 'Nemesis'$$,
  'an enthusiast''s rename is accepted without error'
);

select is(
  (select count(*)::int from public.coasters where name = 'Nemesis'),
  1,
  'but Nemesis is still called Nemesis — the update matched no rows'
);

select lives_ok(
  $$delete from public.coasters where name = 'Nemesis'$$,
  'an enthusiast''s delete is accepted without error'
);

select is(
  (select count(*)::int from public.coasters),
  47,
  'and the catalogue is intact'
);

-- ── the admin has full CRUD ───────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

select is(
  (select public.is_admin()),
  true,
  'is_admin() is true for the admin'
);

select lives_ok(
  $$insert into public.coasters (name, park, country, manufacturer, type)
    values ('Test Coaster', 'Test Park', 'United Kingdom', 'Intamin', 'Steel')$$,
  'the admin can add a coaster'
);

select lives_ok(
  $$update public.coasters set park = 'Renamed Park' where name = 'Test Coaster'$$,
  'and can edit one'
);

select is(
  (select park from public.coasters where name = 'Test Coaster'),
  'Renamed Park',
  'and the edit actually landed'
);

-- ── removing a coaster that has rides must fail loudly ────────────────────
-- on delete restrict, deliberately: a silent cascade would rewrite other
-- people's credit counts without anyone being told. The admin dialog's warning
-- becomes an error the UI reports.
select throws_ok(
  $$delete from public.coasters where name = 'Nemesis'$$,
  '23503',
  null,
  'removing a coaster with rides against it raises a foreign key violation rather than cascading'
);

-- ── anon reaches nothing ──────────────────────────────────────────────────
-- docs/Creddit Count TDD.md: a visitor sees the public leaderboard and nothing
-- else. There is no grant for anon on this table at all.
reset role;
set local role anon;

select throws_ok(
  $$select count(*) from public.coasters$$,
  '42501',
  null,
  'a signed-out visitor cannot read the catalogue'
);

select * from finish();
rollback;
