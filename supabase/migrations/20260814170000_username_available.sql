-- Is a display name still free?
--
-- No caller can answer this for themselves: `authenticated` may read only its
-- own profile row and `anon` has no grant on profiles at all. So the check has
-- to cross the RLS boundary, which makes this security definer.
--
-- Three properties keep that acceptable, and all three are load-bearing:
--
--   It returns one boolean. There is no shape in which a row, an id or anyone
--   else's name can come back out of it.
--
--   It IS an availability oracle for display names, and that is fine *here and
--   nowhere else*: display names are published on public_leaderboard by
--   design, so this exposes nothing that is not already public. It must never
--   be widened to take an email — that would turn it into an account-
--   enumeration endpoint for addresses that are deliberately private.
--
--   The comparison matches the unique constraint on profiles.username exactly,
--   including case. A check that disagreed with the constraint would be worse
--   than no check: it would either reject names that would have inserted
--   cleanly, or promise names that would then fail. `trim` is applied because
--   handle_new_user() trims before inserting, so the two see the same string.
--
-- Whether 'Sergio' and 'sergio' *should* be two different people on a
-- leaderboard is a separate question. Changing that means a case-insensitive
-- unique index on profiles.username and matching this function to it; both
-- move together or the property above breaks.

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles
    where username = trim(p_username)
  );
$$;

comment on function public.username_available(text) is
  'Returns whether a display name is free. Boolean only — never a row. Safe to
   expose because display names are already public on public_leaderboard; do
   not add an email-shaped equivalent.';

revoke execute on function public.username_available(text) from public;
-- anon needs it: the check runs on the signup form, before there is a session.
grant execute on function public.username_available(text) to anon, authenticated;
