-- The public leaderboard — the only data a signed-out visitor can reach.
--
-- This view is the privacy boundary, not a convenience. It runs with the
-- privileges of its owner (postgres), so it sees every row of `ride` regardless
-- of the policies on that table, and publishes only an aggregate.
--
-- The alternative does not work. With security_invoker = on the view would run
-- as the caller, so anon would need its own SELECT policy on `profiles` AND on
-- `ride` — and a SELECT policy on `ride` for anon exposes which coasters each
-- person has ridden. That is precisely what CLAUDE.md §2 forbids. The aggregate
-- has to be computed behind the privilege boundary, and this view is what draws
-- it.

create view public.public_leaderboard as
select
  p.username                        as display_name,
  count(distinct r.coaster_id)::int as credit_count
from public.profiles p
join public.ride r on r.user_id = p.id
where p.leaderboard_opt_in = true
-- Group by the profile, not the name. Grouping by username alone would collapse
-- two people who share one into a single row and merge their distinct-coaster
-- counts, inflating one person's credits with another's. `id` is grouped on but
-- never selected — see below.
group by p.id, p.username;

-- No ORDER BY in the view: PostgREST applies its own, and lib/data/leaderboard.ts
-- already orders explicitly. An ORDER BY here would look load-bearing and not be.

comment on view public.public_leaderboard is
  'Definer-rights view by design: aggregates behind the RLS boundary so anon sees
   counts without gaining row access to ride. Do not set security_invoker.
   Supabase''s security_definer_view advisor flags this deliberately.';

-- ── The grants ARE the access control ──────────────────────────────────────
-- A view has no policies of its own, so this list is the whole of it.
revoke all on public.public_leaderboard from public;
grant select on public.public_leaderboard to anon, authenticated;

-- Two rules follow from that, and both are load-bearing:
--
--   Never `select *` here. Adding a column to profiles would silently publish
--   it. Every column is named above.
--
--   Never expose a filterable identifier — user_id, coaster_id, or profiles.id.
--   PostgREST lets a caller filter on any exposed column, so an id would turn
--   the leaderboard into a per-user lookup. That is why id is in the GROUP BY
--   and not in the select list.
