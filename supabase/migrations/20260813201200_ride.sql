-- Ride history — the private half of the product.
--
-- Note what this file does NOT contain: any policy granting an admin access.
-- "Admins do not have access to users' personal ride histories" (CLAUDE.md §2)
-- is implemented as silence, not as a rule that denies them. With RLS on and no
-- matching policy, an admin's select returns zero rows however it is issued.

create table public.ride (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- restrict, not cascade: removing a catalogue row silently rewrites other
  -- people's credit counts, so it must fail loudly while rides reference it.
  coaster_id uuid not null references public.coasters (id) on delete restrict,
  ridden_on  date not null,
  note       text,
  created_at timestamptz not null default now(),

  -- current_date is stable rather than immutable, which is normally a reason to
  -- keep it out of a CHECK. It is safe here because the bound only moves
  -- forward: a row that satisfied this when written can never stop satisfying
  -- it, so dump and restore stay valid.
  constraint ride_not_in_future check (ridden_on <= current_date),
  constraint ride_note_length check (note is null or char_length(note) <= 500)
);

-- Deliberately no unique constraint on (user_id, coaster_id, ridden_on):
-- riding the same coaster twice in one day is ordinary, and repeat rides are
-- exactly what makes credits and rides differ.

alter table public.ride enable row level security;

-- The policy column must be indexed or every read is a sequential scan.
create index ride_user_id_idx on public.ride (user_id);
-- For the community aggregate, which counts across all users for one coaster.
create index ride_coaster_id_idx on public.ride (coaster_id);

comment on table public.ride is
  'One row per ride. Credits are count(distinct coaster_id) computed at read
   time — there is no stored total anywhere, per CLAUDE.md §3.';

-- ── Privileges ─────────────────────────────────────────────────────────────
revoke all on public.ride from anon, authenticated;
grant select, insert, update, delete on public.ride to authenticated;

-- ── Policies ───────────────────────────────────────────────────────────────
-- Four separate policies rather than one permissive catch-all, so each can be
-- read in isolation and reasoned about on its own.

create policy "ride: owner reads own"
  on public.ride for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "ride: owner inserts own"
  on public.ride for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

-- UPDATE needs both clauses. `using` filters the rows the statement may see;
-- `with check` validates the row it writes. Without the second, a user could
-- move their own ride to somebody else's user_id.
create policy "ride: owner updates own"
  on public.ride for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "ride: owner deletes own"
  on public.ride for delete
  to authenticated
  using ( (select auth.uid()) = user_id );
