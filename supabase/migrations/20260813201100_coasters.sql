-- The shared coaster catalogue, and the admin check that guards writes to it.

create table public.coasters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  park         text not null,
  country      text not null,
  manufacturer text not null,
  type         public.coaster_type not null,
  created_at   timestamptz not null default now()
);

alter table public.coasters enable row level security;

-- Deliberately NOT unique on (name, park). Duplicates are a real data-quality
-- problem an admin curates away, and the catalogue's "Possible duplicates"
-- filter exists to surface them — a constraint here would make that feature
-- dead code. This index is what makes the detection query cheap.
create index coasters_duplicate_idx on public.coasters (lower(name), lower(park));

-- ── The admin check ────────────────────────────────────────────────────────
-- security definer for one reason: a policy on `coasters` that queried
-- `profiles` directly would evaluate profiles' own policies from inside a
-- policy. Crossing the RLS boundary here avoids that recursion.
--
-- search_path is pinned and every reference is schema-qualified. Without that,
-- a caller who can create a schema on their own search_path could shadow
-- `profiles` with a table of their own and decide the answer themselves.
--
-- It takes no argument: the identity comes from auth.uid(), never from a
-- parameter the caller controls.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ── Privileges ─────────────────────────────────────────────────────────────
-- Signed-out visitors get nothing here. docs/Creddit Count TDD.md is explicit
-- that a visitor sees the public leaderboard and nothing else, and no
-- visitor-facing page needs the catalogue.
revoke all on public.coasters from anon, authenticated;
grant select, insert, update, delete on public.coasters to authenticated;

-- ── Policies ───────────────────────────────────────────────────────────────
-- Every signed-in user reads the catalogue: credit counts are only comparable
-- because everyone counts against the same list.
create policy "coasters: authenticated read"
  on public.coasters for select
  to authenticated
  using ( true );

create policy "coasters: admin inserts"
  on public.coasters for insert
  to authenticated
  with check ( (select public.is_admin()) );

create policy "coasters: admin updates"
  on public.coasters for update
  to authenticated
  using ( (select public.is_admin()) )
  with check ( (select public.is_admin()) );

create policy "coasters: admin deletes"
  on public.coasters for delete
  to authenticated
  using ( (select public.is_admin()) );
