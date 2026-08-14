-- Community totals for one coaster: how many people have logged it, and how
-- many rides in total.
--
-- This has to cross the RLS boundary — no single user can count rows they
-- cannot see — so it is security definer. Three things keep that safe:
--
--   It returns two integers. There is no shape in which a coaster id, a user
--   id, a date or a note can come back out of it.
--
--   Its argument is a coaster, not a user. There is no caller identity to
--   re-derive and therefore nothing to forge; asking about a coaster is the
--   whole capability being granted.
--
--   search_path is pinned and every reference is schema-qualified.

create or replace function public.coaster_community_counts(p_coaster_id uuid)
returns table (members int, rides int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(distinct r.user_id)::int as members,
    count(*)::int                  as rides
  from public.ride r
  where r.coaster_id = p_coaster_id;
$$;

comment on function public.coaster_community_counts(uuid) is
  'Counts only. Who rode a coaster, and when, is never exposed — on the coaster
   page or anywhere else.';

revoke execute on function public.coaster_community_counts(uuid) from public, anon;
grant execute on function public.coaster_community_counts(uuid) to authenticated;
