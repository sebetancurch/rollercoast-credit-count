# Credit Count

A rollercoaster credit tracker. A **credit** is one coaster ridden at least once; a
**ride** is one riding of it. Ride the same coaster again and your ride count goes up
while your credit count does not — the gap between those two numbers is the product.
Ride history is private by default and the public leaderboard is opt-in.

**Live — <https://rollercoast-credit-count.vercel.app>**

The leaderboard is the only page a signed-out visitor can reach. Not by a redirect:
`anon` holds `select` on one aggregate view and on nothing else.

## Demo accounts

Defined in [`supabase/seed.sql`](supabase/seed.sql); credentials are supplied with the
submission.

| Display name | What it shows |
|---|---|
| Cass Ferreira | 62 rides across 36 credits, opted **out** — the private dashboard, and a high count that never reaches the board |
| Rowan Selby | Admin — catalogue management, and no access to anybody's ride history |
| woodie_wendy | Rank 1, 30 credits |
| brand_new_bea | Opted **in** with no rides, and still absent — opting in is necessary, not sufficient |

## Where to check each acceptance criterion

| | Where |
|---|---|
| 1 · sign up, log rides, see counts and stats | `/signup`, then `/dashboard` |
| 2 · one user cannot reach another's rides, by UI or by API | `tests/rls/ride.test.ts` · `supabase/tests/ride_rls.test.sql` |
| 3 · leaderboard signed-out, opted-in only, two columns | `/` · `supabase/migrations/*_public_leaderboard.sql` |
| 4 · only admins write the catalogue | `/admin/coasters` · `tests/rls/catalogue.test.ts` |
| 5 · no secrets in client code or the repository | `lib/env.ts` · `.env.example` |
| 6 · the TDD describes what was built | [`docs/Creddit Count TDD.md`](docs/Creddit%20Count%20TDD.md) |

## Run it locally

Needs Node 20+, pnpm and Docker Desktop.

```bash
pnpm install
cp .env.example .env.local
```

Fill in the two values that `supabase start` prints, then:

```bash
pnpm exec supabase start
pnpm db:reset
pnpm dev
```

## Commands

```bash
pnpm test          # vitest: unit + RLS (RLS needs the local stack up)
pnpm test:unit     # pure tests only, no database
pnpm db:test       # pgTAP policy suite
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint .
```

```bash
node scripts/walkthrough.mjs
```

The walkthrough signs in through supabase-js and requests the real pages as each role,
so it exercises the server components, the proxy and RLS together. It needs a running
dev server.

## Architecture

Next.js 16 (App Router) on Supabase. Reads are server components querying through
`lib/data/*.ts`; writes are server actions in `app/*/actions.ts`, each re-reading the
session and taking `user_id` from it rather than from its arguments. Credits are never
stored — they are `count(distinct coaster_id)` derived at read time, by `lib/stats.ts`
for the dashboard and in SQL for the leaderboard, so the two cannot desynchronise.

**RLS is the security boundary.** The guards in `lib/auth/session.ts` and the redirect in
`proxy.ts` keep people off pages that would only show them an error; they are a
convenience. What stops one user reaching another's data is the policy set in
`supabase/migrations/`, proven by pgTAP and again by real JWTs through PostgREST. The
anon key is public by design, because RLS decides what its bearer can see; the
service-role key bypasses RLS and is never in `.env.local`, never `NEXT_PUBLIC_`, and
never imported by the app.

Full detail in [`docs/Creddit Count TDD.md`](docs/Creddit%20Count%20TDD.md).
