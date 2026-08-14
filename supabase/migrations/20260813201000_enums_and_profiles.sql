-- Enums and the profiles table.
--
-- `profiles` is what docs/DB Model.png calls `users`, minus two columns that
-- must not exist here:
--
--   password  auth.users owns credentials, bcrypt-hashed, in a schema PostgREST
--             does not expose. A password column in `public` would be a second
--             credential store reachable over the API.
--   email     auth.users.email is the source of truth. A copy drifts on email
--             change and turns any profile read into an email disclosure.
--
-- What remains is the public mirror of an auth identity: only what the policies
-- and the leaderboard need.

create type public.user_role as enum ('enthusiast', 'admin');
create type public.coaster_type as enum ('Steel', 'Wooden', 'Hybrid');

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text not null unique,
  role               public.user_role not null default 'enthusiast',
  -- Private by default. CLAUDE.md §2: only opted-in users reach the board.
  leaderboard_opt_in boolean not null default false,
  created_at         timestamptz not null default now(),

  constraint profiles_username_length check (char_length(username) between 1 and 40)
);

comment on column public.profiles.username is
  'The leaderboard display name. Unique: public_leaderboard groups by profile, and
   two people sharing a name would otherwise be indistinguishable on the board.';

alter table public.profiles enable row level security;

-- ── Privileges ─────────────────────────────────────────────────────────────
-- Supabase grants ALL on new public tables to anon and authenticated by
-- default, leaving RLS as the only filter. Here that is not enough: RLS decides
-- which *rows* a statement may touch and cannot express "this row but not this
-- column", because `with check` has no access to the old value.
--
-- So the escalation guard is a column privilege, not a policy. Revoke the
-- table-wide UPDATE first — a table-level grant covers every column, and
-- revoking a single column against it has no effect — then grant back only the
-- two columns a user may change. `role` is not among them.
revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (username, leaderboard_opt_in) on public.profiles to authenticated;

-- No INSERT: the handle_new_user trigger creates the row at signup.
-- No DELETE: profiles disappear when auth.users cascades.
-- anon gets nothing. It reaches credit counts only through public_leaderboard,
-- which aggregates behind this boundary.

-- ── Policies ───────────────────────────────────────────────────────────────
-- (select auth.uid()) rather than bare auth.uid(): the subquery form lets the
-- planner evaluate it once as an initplan instead of once per row.

create policy "profiles: owner reads own"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles: owner updates own"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );
