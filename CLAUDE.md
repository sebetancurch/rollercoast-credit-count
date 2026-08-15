# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Credit Count is a rollercoaster credit tracker: Next.js 16 (App Router) on Supabase
(Auth, Postgres, RLS), managed with pnpm. A *credit* is one coaster ridden at least
once; a *ride* is one riding of it. The gap between those two numbers is the product.

## Commands

```bash
pnpm dev                 # dev server on :3000
pnpm build               # production build (also typechecks)
pnpm typecheck           # tsc --noEmit
pnpm lint                # eslint .
pnpm test                # vitest: unit + RLS (RLS needs the local stack up)
pnpm test:unit           # pure tests only — no database needed
pnpm test:rls            # integration tests only
```

One test file, or one test:

```bash
pnpm exec vitest run tests/unit/stats.test.ts
pnpm exec vitest run -t "counts one credit per distinct coaster"
```

Database (needs Docker Desktop running):

```bash
pnpm exec supabase start     # first time, or after a reboot
pnpm db:reset                # replay every migration, then seed.sql
pnpm db:test                 # pgTAP suite in supabase/tests/
pnpm db:types                # regenerate lib/database.types.ts
```

**`pnpm db:types` after every migration**, or `typecheck` fails on the next RPC or column
you touch. `lib/database.types.ts` is generated output — never hand-edit it.

End-to-end check against a running dev server and the local stack:

```bash
node scripts/walkthrough.mjs
```

It signs in through supabase-js, forges the `@supabase/ssr` session cookie, and asserts
every page as each role. Keep it working; it is the only thing that exercises the server
components, the proxy and RLS together.

## Architecture

### RLS is the security boundary. Nothing in TypeScript is.

`proxy.ts` and the `requireEnthusiast()` / `requireAdmin()` guards in
`lib/auth/session.ts` redirect people who would only see an error. They are a
convenience. What actually stops one user reaching another's data is the policy set in
`supabase/migrations/`, proven by `supabase/tests/*.test.sql` (pgTAP) and `tests/rls/`
(real JWTs through PostgREST). Never describe a UI guard as enforcing privacy, and never
let one be the only thing standing between a role and data.

Two consequences worth internalising:

- **Admins have no policy on `ride` at all.** "Admins cannot see ride histories" is
  implemented as silence, not as a rule that denies them.
- **The escalation guard is a column privilege, not a policy.** `authenticated` holds
  UPDATE on `profiles.username` and `leaderboard_opt_in` and nothing else, because RLS
  cannot express "this row but not this column" — `with check` cannot see the old value.

### Everything DB-facing goes through two module groups

```
lib/auth/session.ts     getCurrentUser() + the require* guards
lib/data/*.ts           leaderboard, coasters, rides — every read
```

Pages and components never build a Supabase query themselves. This started as a swap
seam (the app ran on fixtures before the database existed) and is worth keeping: it is
where the "scoped to this user" intent is written down.

- **Reads → server components**, querying directly. No API routes, no `useEffect`.
- **Writes → server actions** in `app/*/actions.ts`. A server action is a public HTTP
  endpoint: re-read the session inside it, parse the payload with the zod schemas in
  `lib/validation.ts`, and take `user_id` from the verified session — never from an
  argument.
- **`getUser()`, never `getSession()`** on the server. getSession trusts a cookie the
  client can write.

Three Supabase clients with three lifetimes live in `lib/supabase/`; the server one is
built per request and must never be hoisted to a module constant.

### Credits are always derived

`lib/stats.ts` computes credits as `count(distinct coaster_id)` from the ride list at
read time, and `public_leaderboard` does the same in SQL. There is no stored total
anywhere, and `.claude/hooks/guard.mjs` will refuse a migration that adds one.

`public_leaderboard` is a **definer-rights view on purpose** — it aggregates behind the
RLS boundary so `anon` sees counts without gaining row access to `ride`. Supabase's
`security_definer_view` advisor flags it; that is expected and documented in the view's
own comment. Do not "fix" it with `security_invoker`, and never add a filterable
identifier to it — PostgREST lets callers filter on any exposed column.

### The UI comes from a Claude Design project

The approved design is a Claude Design project, read with the `DesignSync` tool (not a
URL fetch) — see the memory note `design-prototype-source`. It emits inline styles; this
repo keeps a class layer in `app/globals.css` instead, so components carry
`className="btn btn-primary"` and the palette lives in one file.

The design has been restyled once already (Broadsheet serif → Anton/Archivo on navy and
electric cyan). **Re-fetch the design file before acting on a design request** rather
than trusting a copy from earlier in a session.

A recurring bug class to watch: anchor rules like `a:hover` or `.nav a` are
element-plus-pseudo/class selectors at `0-1-1`, so they outrank a bare `.btn` class at
`0-1-0` and repaint the labels of buttons that are `<Link>`s. Put colour on the specific
component, not on a broad descendant selector — this has been introduced twice.

## Project rules

### Hard security & RLS rules (do not break)

- **Enthusiasts** can read, insert, update and delete only their *own* `ride` rows
  (`auth.uid() = user_id`). One user must never reach another's ride history.
- **Admins** have exclusive INSERT/UPDATE/DELETE on `coasters`, and **no** access to
  anyone's `ride` history.
- **Visitors** (unauthenticated) can read `public_leaderboard` only.
- **Leaderboard:** only profiles with `leaderboard_opt_in = true` appear, and the view
  exposes `display_name` and `credit_count` — never which coasters anyone rode.

### Data architecture

No static `credit_count` column and no `credits` table. Credits and ride totals are
computed dynamically via SQL views or RPCs so they cannot desynchronise.

### Workflow

- `docs/` (the SOW and TDD) is the source of truth for architectural decisions. Note the
  TDD's DBML predates the build: it has `password` and `email` columns that must not
  exist (Supabase Auth owns those) and integer keys that cannot work with Auth's UUIDs.
  `supabase/migrations/` is what actually shipped.
- Keep changes small and modular; break complex features into sub-tasks.
- Write the schema/endpoint tests before the UI that consumes them.
- Do not install a package that is not strictly necessary for the `docs/` requirements.

## Skills

Three project skills carry the detail and are loaded on demand — defer to them rather
than reasoning from first principles:

- **`supabase-patterns`** — RLS policy shape, the `(select auth.uid())` performance
  idiom, definer functions, migration workflow.
- **`nextjs-patterns`** — server/client boundaries, the three client factories, server
  actions, env var exposure.
- **`e2e-tester`** — the Vitest/Playwright/pgTAP split, and how RLS failures actually
  present (a blocked SELECT returns `[]` with no error; a blocked INSERT returns `42501`;
  a blocked UPDATE silently affects zero rows).

## Gotchas that cost real time

- **`.env*` files are deny-listed** for Read and Edit in `.claude/settings.json`. You
  cannot create or read `.env.local`; ask the user, or use the sanctioned
  `cp .env.example .env` bootstrap. `.env.example` is readable on purpose.
- **`.claude/hooks/guard.mjs` screens shell commands and MCP SQL.** It denies `npx`/`npm`
  (pnpm only), `DROP`/`TRUNCATE`/unbounded writes, RLS weakening, and ad-hoc DDL through
  `execute_sql` — schema changes go through `apply_migration`. Run
  `node .claude/hooks/guard.mjs --selftest` after editing it, and add both the blocked
  case and the near-miss.
- **Hook and settings changes need a Claude Code restart** to take effect.
- The MCP server registers its tools under an opaque per-connection id
  (`mcp__<uuid>__execute_sql`), so anything matching on the literal name `supabase` will
  silently stop firing.
- **Local stack:** the `supabase_vector` container restart-loops on Windows. It is the
  log shipper for Studio's Logs pane only — everything functional stays healthy.
- **Signing up with an already-registered email is a silent no-op** — no error, no email,
  by design (it would otherwise reveal which addresses have accounts). To retest signup
  use a `+alias` address, or delete the *auth user* (deleting the `profiles` row does not
  reset an account, it just breaks it: the trigger only fires on INSERT into
  `auth.users`).
- **Hosted Supabase has email confirmation ON by default; the local stack has it off.**
  Signup returns no session on hosted, which is why `app/auth/callback/route.ts` exchanges
  the PKCE code and `signUp` passes `emailRedirectTo`. **This project's hosted instance
  has it turned off** (Authentication → Sign In / Providers → Email → Confirm email), so a
  reviewer can sign up without waiting on mail that the built-in SMTP rate-limits. The
  callback route and the "check your email" branch in `components/auth-form.tsx` stay
  regardless: both are correct the moment it is switched back on.
- `next.config.ts` carries `allowedDevOrigins` for the Hyper-V bridge address. Without it
  Next 16 blocks `/_next/hmr` cross-origin and the page loads but never hydrates. That
  address is what `next dev` prints as **Network** because `getNetworkHost()` takes the
  first non-loopback interface, which on this machine is `vEthernet (Default Switch)` —
  ahead of the real LAN address. Develop on `localhost` anyway: a bare IP is not a secure
  context in Chromium, so anything gated on one silently behaves differently.
- **`localhost:3000` returning HTTP 431 is a browser cookie problem, not a server one.**
  Node rejects the request before Next sees it, once the header block passes
  `--max-http-header-size`. Cookies are scoped by host and not by port, so `localhost` is
  one jar shared with every other dev server ever run on this machine, and Supabase's auth
  token is chunked across several cookies. `pnpm dev` goes through `scripts/dev.mjs`,
  which raises the limit to 32 KB — that buys headroom, it does not clear the jar. The
  fix is to delete the site data for `localhost` in the browser.

## Seeding

`supabase/seed.sql` is the source of truth and only ever runs under `pnpm db:reset`. It
writes `auth.users` and `auth.identities` directly, which is correct for the superuser
the local reset runs as and wrong anywhere else.

For a hosted project use `pnpm db:seed:remote`, which creates the same accounts through
the Admin API (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment — the
service-role key bypasses RLS, so it is never in `.env.local`, never `NEXT_PUBLIC_`, and
never imported by the app). It reads the data by **parsing `seed.sql`** via
`scripts/seed-fixtures.mjs` rather than restating it, so the two environments cannot
drift; `tests/unit/seed-parity.test.ts` fails if that parse stops matching.

Load-bearing properties of the seed — a change that breaks one breaks tests in three
places (`supabase/tests/`, `tests/support/clients.ts`, `scripts/walkthrough.mjs`):

- Cass has 62 rides across 36 coasters, and the catalogue has 47. These are asserted by
  name all over the suite; extend the seed by **adding people**, never by touching hers.
- 16 members sit on the board, so the page's `limit(15)` is actually exercised.
- `brand_new_bea` is opted in with no rides and must never appear — opting in is
  necessary, not sufficient.
- `woodie_wendy` holds rank 1 with 30 credits. Nothing new may outrank her.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
