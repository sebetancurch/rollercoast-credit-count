---
name: supabase-patterns
description: Supabase patterns for this project — RLS policy design and the auth.uid() performance idiom, why views bypass RLS and when that is the correct choice, security definer functions, migration workflow, and typed clients. Use when writing or reviewing anything under supabase/, any SQL, any policy, any view or RPC, or when deciding how a role is allowed to reach data.
---

# Supabase patterns

The privacy model in `CLAUDE.md` §2 is enforced in Postgres, not in React. Every rule
below exists because the UI hiding a button is not a security control.

## RLS is off until you turn it on

A table in the `public` schema is reachable through PostgREST the moment it exists.
Without RLS enabled, anyone holding the anon key can read all of it. Every migration
that creates a table must, in the same migration, enable RLS.

```sql
create table public.ride (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  coaster_id  uuid not null references public.coasters (id),
  ridden_on   date not null,
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.ride enable row level security;

-- The policy column must be indexed or every query does a sequential scan.
create index ride_user_id_idx on public.ride (user_id);
```

Enabling RLS with no policies denies everything. That is the correct starting state:
add policies to open up exactly what a role needs.

## Policy shape

Four separate policies beat one permissive catch-all — you can read each in isolation
and reason about it.

```sql
create policy "ride: owner reads own"
  on public.ride for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "ride: owner inserts own"
  on public.ride for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "ride: owner updates own"
  on public.ride for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "ride: owner deletes own"
  on public.ride for delete
  to authenticated
  using ( (select auth.uid()) = user_id );
```

Three details that are easy to get wrong:

- **`(select auth.uid())`, not bare `auth.uid()`.** Wrapping it in a subquery lets the
  planner evaluate it once as an initplan instead of once per row. On a ride history
  of any size this is the difference between a millisecond and a table scan's worth of
  function calls.
- **`to authenticated`.** Without it the policy is also evaluated for `anon`, which
  costs time and makes the intent murkier.
- **`using` vs `with check`.** `using` filters rows the statement may *see*; `with
  check` validates rows the statement *writes*. UPDATE needs both, or a user can move
  their own row to another user's `user_id`.

Admins get no policy on `ride` at all. That is the whole implementation of "admins do
not have access to users' personal ride histories" — silence, not a negative rule.

## Views bypass RLS, and here that is the point

A view runs with the privileges of its **owner**, not the caller. A `postgres`-owned
view over `ride` therefore sees every row regardless of the policies above. That is
usually a footgun; for `public_leaderboard` it is exactly the mechanism required.

Consider the alternative. With `security_invoker = on`, the view runs as the caller,
so `anon` would need its own SELECT policies on `profiles` **and** `ride` to see
anything — and a SELECT policy on `ride` for `anon` would expose which coasters each
user has ridden. That directly violates "the leaderboard must only expose
`display_name` and `credit_count`". So the aggregate must be computed behind the
privilege boundary, and the view is what draws that boundary.

```sql
create view public.public_leaderboard as
select
  p.username                        as display_name,
  count(distinct r.coaster_id)::int as credit_count
from public.profiles p
join public.ride r on r.user_id = p.id
where p.leaderboard_opt_in = true
group by p.username;

-- The view's own grants are now the only access control on it. Be explicit.
revoke all on public.public_leaderboard from public;
grant select on public.public_leaderboard to anon, authenticated;
```

Because the grant list is the entire control, two rules follow:

- **Never `select *` in this view.** Adding a column to `profiles` would silently
  publish it. Name every column.
- **Never add a filterable identifier** (`user_id`, `coaster_id`, `id`) to it. PostgREST
  lets a caller filter on any exposed column, so a `user_id` column turns the
  leaderboard into a per-user lookup.

Supabase's security advisor flags `postgres`-owned definer views (`security_definer_view`).
That warning is correct in general; here it is a deliberate, documented choice. Record
the rationale in a comment on the view so the next reader does not "fix" it:

```sql
comment on view public.public_leaderboard is
  'Definer-rights view by design: aggregates behind the RLS boundary so anon sees
   counts without gaining row access to ride. Do not set security_invoker.';
```

Prefer `security_invoker = on` for every *other* view you add. It is the safe default
and only this one view has a reason to differ.

## Security definer functions

When you need parameterised aggregation instead of a static view, use a function —
and always pin `search_path`, or a caller can shadow a table name with one in a schema
they control and hijack the function body.

```sql
create or replace function public.my_credit_summary()
returns table (total_rides int, total_credits int)
language sql
security invoker          -- prefer invoker; the caller's RLS already scopes this
set search_path = ''      -- pinned; reference everything schema-qualified
as $$
  select count(*)::int, count(distinct coaster_id)::int
  from public.ride
  where user_id = (select auth.uid());
$$;
```

Reach for `security definer` only when the function must cross the RLS boundary, and
then re-derive the caller inside the body from `auth.uid()` rather than trusting a
parameter. A `security definer` function that takes a `user_id` argument and does not
check it against `auth.uid()` is an open read of everyone's data.

## Credits are always derived

Per `CLAUDE.md` §3 there is no stored count anywhere — no `credit_count` column, no
`credits` table, no materialized view refreshed on a timer. A credit is
`count(distinct coaster_id)` and a ride total is `count(*)`, computed at read time.
Anything cached can drift from the rows it summarises, and a leaderboard that
disagrees with a user's own dashboard is worse than a slow one. If it ever becomes too
slow, the fix is an index or a `security definer` function — not a stored column.

## Migrations

Schema changes live in `supabase/migrations/<timestamp>_<name>.sql` and nowhere else.
Ad-hoc SQL against a project leaves no history, so the next environment drifts.

```bash
supabase migration new add_ride_policies   # creates the timestamped file
supabase db reset                          # replays every migration on the local DB
supabase gen types typescript --local > lib/database.types.ts
```

Write migrations forward-only and idempotent where you can (`create ... if not
exists`, `drop policy if exists` before `create policy`). Each migration should leave
the database in a state where the RLS test suite passes.

## Clients

Three clients, three lifetimes. Never share one across a request boundary.

- **Browser** — `createBrowserClient` from `@supabase/ssr`, anon key, module singleton.
- **Server** (components, actions, route handlers) — `createServerClient` from
  `@supabase/ssr`, anon key, constructed per request with that request's cookies. The
  user's JWT is what makes RLS apply, so this client is already correctly scoped.
- **Service role** — bypasses RLS completely. Not used in this project. If a task
  seems to need it, the policy design is wrong; fix the policy. It must never reach a
  file the browser bundles, and never appear anywhere but the server's environment.

Type the clients with generated types so a renamed column is a compile error:

```ts
import type { Database } from "@/lib/database.types";
const supabase = createServerClient<Database>(url, anonKey, { cookies: { ... } });
```

## Reviewing SQL

Before applying any migration, check:

- Does every new table `enable row level security` in the same file?
- Is the policy column indexed?
- Are `auth.uid()` calls wrapped in `(select ...)`?
- Does every UPDATE policy have both `using` and `with check`?
- Does anything grant to `anon` or `public` beyond `public_leaderboard`?
- Does any view `select *`, or expose an id that PostgREST would let a caller filter on?
- Does any `security definer` function omit `set search_path = ''`?
