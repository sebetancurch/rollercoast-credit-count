---
name: e2e-tester
description: Testing conventions for this project — the Vitest / Playwright / pgTAP split, how to write authorization tests that actually prove RLS holds, the auth-state fixture pattern, deterministic seed data, and how to read a failing run. Use when writing any test file, setting up a test harness, or diagnosing a failing suite.
---

# Testing

Three layers, each proving something the others cannot.

| Layer | Tool | Lives in | Proves |
|---|---|---|---|
| Database | pgTAP | `supabase/tests/*.test.sql` | Policies behave at the SQL level, no app involved |
| Integration | Vitest | `tests/rls/`, `tests/integration/` | A real Supabase client with a real JWT sees only what it should |
| End-to-end | Playwright | `e2e/*.spec.ts` | The flows a user actually performs work in a browser |

Unit tests (`tests/unit/`) cover pure logic — date formatting, aggregation helpers,
validation schemas. Keep them free of network and database.

## Authorization tests are the point

Most of this suite's value is in proving a user cannot reach another user's data. Test
that against the database with real tokens. A Playwright test showing the delete button
is hidden proves nothing: the button is not what stops the request.

```ts
// tests/support/clients.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

export const anonClient = () =>
  createClient<Database>(url, anonKey, { auth: { persistSession: false } });

export async function signedInAs(email: string, password: string) {
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in ${email}: ${error.message}`);
  return client;
}
```

### RLS failures do not all look the same

This trips up most first attempts. Assert on the shape the database actually produces:

- **SELECT** blocked by a policy returns `data: []` and `error: null`. Rows are
  filtered out, not rejected. Asserting `expect(error).toBeTruthy()` here fails against
  a perfectly secure database.
- **INSERT** violating a `with check` returns an error, code `42501`.
- **UPDATE / DELETE** that no row satisfies under `using` return `data: []` and
  `error: null` — zero rows affected. Verify by re-reading the row as its owner and
  confirming it is unchanged. This is the assertion people forget, and it is the one
  that would catch a policy that lets writes through.

```ts
describe("ride isolation", () => {
  it("returns no rows when one enthusiast selects another enthusiast's ride", async () => {
    const intruder = await signedInAs(users.bob.email, users.bob.password);
    const { data, error } = await intruder.from("ride").select("*").eq("id", seeded.aliceRideId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("leaves the row untouched when one enthusiast updates another's ride", async () => {
    const intruder = await signedInAs(users.bob.email, users.bob.password);
    await intruder.from("ride").update({ note: "hijacked" }).eq("id", seeded.aliceRideId);

    // Zero rows affected is silent. The proof is what the owner still sees.
    const owner = await signedInAs(users.alice.email, users.alice.password);
    const { data } = await owner.from("ride").select("note").eq("id", seeded.aliceRideId).single();
    expect(data?.note).toBe(seeded.aliceRideNote);
  });

  it("rejects an insert attributed to another user", async () => {
    const intruder = await signedInAs(users.bob.email, users.bob.password);
    const { error } = await intruder.from("ride").insert({
      user_id: users.alice.id,
      coaster_id: seeded.coasterId,
      ridden_on: "2026-01-01",
    });

    expect(error?.code).toBe("42501");
  });
});
```

### The matrix to cover

Every data-touching feature gets a row here. Each cell is a test.

| | `ride` | `coasters` | `public_leaderboard` |
|---|---|---|---|
| anon | no access | read only | read |
| enthusiast (own) | full CRUD | read only | read |
| enthusiast (other's) | nothing | — | read |
| admin | **nothing** | full CRUD | read |

Plus the leaderboard's own rules: a user with `leaderboard_opt_in = false` is absent;
the returned rows have exactly the keys `display_name` and `credit_count`.

```ts
it("exposes only display_name and credit_count", async () => {
  const { data } = await anonClient().from("public_leaderboard").select("*").limit(1);
  expect(Object.keys(data![0]).sort()).toEqual(["credit_count", "display_name"]);
});
```

That one assertion is what catches a future `select *` regression leaking a column.

## Database-level tests

pgTAP tests run inside the database and can impersonate a role without any HTTP,
which makes them the fastest way to pin down policy behaviour.

```sql
-- supabase/tests/ride_rls.test.sql
begin;
select plan(2);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select is( (select count(*)::int from ride), 2, 'alice sees exactly her own two rides' );

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is( (select count(*)::int from ride), 0, 'bob sees none of alice''s rides' );

select * from finish();
rollback;
```

Run with `supabase test db`. Each file wraps itself in a transaction and rolls back,
so tests never leak state into each other.

## Playwright

Sign in once per role, reuse the storage state.

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";

setup("authenticate as enthusiast", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_ENTHUSIAST_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_ENTHUSIAST_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/enthusiast.json" });
});
```

```ts
// playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "enthusiast",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/enthusiast.json" },
      dependencies: ["setup"],
    },
    {
      name: "visitor",
      use: { ...devices["Desktop Chrome"], storageState: { cookies: [], origins: [] } },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

`e2e/.auth/` holds real session tokens. It belongs in `.gitignore`.

### Locators

Role and label first — they break when the accessible experience breaks, which is
when you want them to break.

```ts
page.getByRole("button", { name: "Log a ride" });
page.getByLabel("Ride date");
page.getByRole("row", { name: /Steel Vengeance/ });
```

Reach for `getByTestId` only when nothing accessible identifies the element. Never
assert on CSS classes or DOM structure.

Never use `waitForTimeout`. Playwright's assertions auto-retry; `await expect(...)`
already waits. A sleep in a test is a race condition with a longer fuse.

## Deterministic data

Tests that share mutable state fail in ways nobody can reproduce.

- Seed a known fixture set in `supabase/seed.sql`: two enthusiasts (one opted into the
  leaderboard, one not), one admin, a handful of coasters across different countries,
  manufacturers, and types, and rides that include **two rides on the same coaster** so
  the credits-versus-rides distinction is actually exercised.
- Use fixed UUIDs and fixed dates. No `Math.random()`, no bare `new Date()`.
- Each test creates the rows it mutates and cleans up after itself, or works only on
  rows no other test touches.
- Reset between runs with `supabase db reset`, which replays migrations then `seed.sql`.

## Prerequisites

Tests need a local stack. Docker must be running.

```bash
supabase start        # prints the local URL, anon key, and service key
pnpm exec playwright install --with-deps
```

Point `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the local instance via `.env.test`,
never at a hosted project. Tests delete and mutate rows.

## Reading a failing run

Run the narrow suite first, then widen. The signal is in the full output, not the
summary line.

```bash
pnpm test tests/rls                        # Vitest, one directory
pnpm exec playwright test e2e/rides.spec.ts --project=enthusiast
supabase test db
```

When something fails, separate the two cases before changing anything:

- **The test is wrong** — bad import, missing fixture, an assertion expecting an error
  where RLS silently filters (see above). Fix the test.
- **The code is wrong** — the assertion describes correct behaviour and the app does
  not do it. Fix the code, and leave the test alone.

Conflating these produces tests weakened until they pass, which is worse than no tests.
If a security test fails, assume the code is wrong until proven otherwise.

Playwright failures come with a trace: `pnpm exec playwright show-trace <path>` for the
DOM, network, and console at the moment of failure. Supabase errors carry `code`,
`details`, and `hint` — log the whole object, not `error.message` alone. `42501` is an
RLS denial; `PGRST116` means zero rows where `.single()` demanded exactly one, which
usually means RLS filtered the row rather than that it is missing.
