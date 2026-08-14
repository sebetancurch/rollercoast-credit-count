-- Ride history isolation — the policy set that carries most of this product's
-- privacy promise. Run with `supabase test db`.
--
-- Everything is inside a transaction that rolls back, so these never leak state.
--
-- Note the shape of the blocked-write assertions. An UPDATE or DELETE that no
-- row satisfies under `using` does not raise: it matches nothing and reports
-- success. So the test is `lives_ok` on the attempt plus a re-read as the owner
-- showing the data is untouched. Asserting an error there would fail against a
-- perfectly secure database.

begin;
select plan(12);

set local role authenticated;

-- ── an owner sees exactly their own rides ─────────────────────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.ride),
  62,
  'Cass sees exactly her own 62 rides'
);

select is(
  (select count(distinct coaster_id)::int from public.ride),
  36,
  'and 36 distinct coasters — credits are derived, never stored'
);

-- ── another enthusiast sees none of them ──────────────────────────────────
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*)::int from public.ride
   where user_id = '11111111-1111-4111-8111-111111111111'),
  0,
  'Priya sees none of Cass''s rides'
);

select is(
  (select count(*)::int from public.ride),
  12,
  'Priya sees only her own 12'
);

-- ── writes attributed to somebody else are rejected outright ──────────────
select throws_ok(
  format(
    'insert into public.ride (user_id, coaster_id, ridden_on) values (%L, %L, %L)',
    '11111111-1111-4111-8111-111111111111',
    (select id from public.coasters order by name limit 1),
    '2026-01-01'
  ),
  '42501',
  null,
  'Priya cannot insert a ride attributed to Cass'
);

-- ── but a blocked update or delete is silent ──────────────────────────────
select lives_ok(
  $$update public.ride set note = 'hijacked'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'Priya''s update of Cass''s rides is accepted without error'
);

select lives_ok(
  $$delete from public.ride
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'and so is her delete of them'
);

-- ── the proof is what the owner still sees ────────────────────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.ride),
  62,
  'Cass still has all 62 rides — neither statement touched a row'
);

select is(
  (select count(*)::int from public.ride where note = 'hijacked'),
  0,
  'and none of them were rewritten'
);

-- ── an owner cannot move a ride to another user ───────────────────────────
-- The `with check` half of the update policy. Without it, `using` alone would
-- let an owner hand their row to somebody else.
select throws_ok(
  $$update public.ride set user_id = '22222222-2222-4222-8222-222222222222'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'Cass cannot reassign her own ride to Priya'
);

-- ── the admin sees nothing at all ─────────────────────────────────────────
-- Not a rule that denies them: there is simply no policy on ride that an admin
-- matches. Silence is the implementation.
set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

select is(
  (select count(*)::int from public.ride),
  0,
  'the admin sees zero rides — no policy on ride grants them any'
);

-- ── anon reaches nothing ──────────────────────────────────────────────────
reset role;
set local role anon;

select throws_ok(
  $$select count(*) from public.ride$$,
  '42501',
  null,
  'a signed-out visitor cannot read ride at all — there is no grant, let alone a policy'
);

select * from finish();
rollback;
