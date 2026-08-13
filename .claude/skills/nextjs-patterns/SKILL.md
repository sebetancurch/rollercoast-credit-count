---
name: nextjs-patterns
description: Next.js App Router patterns for this project — server vs client component boundaries, the three @supabase/ssr client factories and their cookie contracts, middleware session refresh, server actions for mutations, dynamic rendering, and env var exposure rules. Use when creating or editing anything under app/, middleware.ts, lib/supabase/, or when deciding where a piece of data fetching or mutation belongs.
---

# Next.js patterns

App Router, React Server Components by default, `@supabase/ssr` for auth. The rules
below are mostly about one question: which side of the server/client line does this
belong on, and which Supabase client goes with it.

## Layout

```
app/
  layout.tsx                    root shell + nav
  page.tsx                      public leaderboard (the visitor landing page)
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  dashboard/page.tsx            enthusiast only
  dashboard/rides/page.tsx      ride history + CRUD
  admin/coasters/page.tsx       admin only
  auth/callback/route.ts        exchanges the auth code for a session
lib/
  supabase/client.ts            browser client
  supabase/server.ts            per-request server client
  supabase/middleware.ts        session refresh helper
  database.types.ts             generated — never hand-edited
middleware.ts
```

## Three clients, three contracts

**Browser** — only in files carrying `"use client"`.

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

**Server** — server components, server actions, route handlers. Built fresh per
request; never hoisted to a module-level constant, or one user's session leaks into
another's request.

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();          // async in Next 15+

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. Harmless here: middleware
            // already refreshed the session for this request.
          }
        },
      },
    },
  );
}
```

Use `getAll`/`setAll`. The older `get`/`set`/`remove` triple is deprecated and drops
cookie chunks for large sessions.

**Service role** — not used in this project. See `supabase-patterns`.

## `getUser()`, never `getSession()`, on the server

`getSession()` reads the session out of the cookie and returns it without checking
whether it is genuine — a cookie the client can write. `getUser()` revalidates the JWT
with the Supabase Auth server.

```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

Any server-side authorization decision — a redirect, a role check, rendering the admin
nav — reads from `getUser()`. On the client, `getSession()` is fine for display state,
because the client is not a trust boundary anyway.

## Middleware refreshes the session

Server Components cannot write cookies, so without middleware the auth token expires
and never renews.

```ts
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not put code between createServerClient and getUser(). A stray await here
  // makes session bugs that only appear intermittently in production.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;   // must be this object, cookies and all
}
```

If you need to return a different response, copy the cookies onto it first
(`response.cookies.setAll(supabaseResponse.cookies.getAll())`). Returning a fresh
`NextResponse` discards the refreshed token and silently logs the user out.

Middleware is a convenience redirect, not a security boundary — RLS is. Never let it
be the only thing standing between a role and data.

```ts
// middleware.ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
```

## Where each kind of work goes

**Reads → server components.** Query directly in an `async` component. No API route,
no `useEffect`, no client-side fetch. The user's cookie scopes the query and RLS does
the filtering.

```tsx
export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_leaderboard")
    .select("display_name, credit_count")
    .order("credit_count", { ascending: false })
    .limit(100);

  if (error) throw error;             // caught by error.tsx
  return <LeaderboardTable rows={data ?? []} />;
}
```

**Writes → server actions.** Colocate them, validate input, revalidate the paths that
displayed the old data.

```ts
"use server";

export async function logRide(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = rideSchema.safeParse({
    coaster_id: formData.get("coaster_id"),
    ridden_on: formData.get("ridden_on"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: "Invalid ride details" };

  // user_id comes from the verified session, never from the form.
  const { error } = await supabase
    .from("ride")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { error: "Could not save that ride" };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rides");
  return { ok: true };
}
```

A server action is a public HTTP endpoint. Treat every argument as hostile: re-check
the session inside the action, validate the payload, and never accept an id that
identifies *who* is acting.

**Route handlers** only where an action cannot go: the OAuth callback, webhooks, file
responses.

**Client components** for interactivity only — form state, optimistic updates,
filters, modals. Push `"use client"` as far down the tree as it will go. A client
component at the page level drags the whole subtree into the bundle.

## Rendering and caching

Reading `cookies()` opts a route into dynamic rendering, so every authenticated page
here is dynamic by definition — that is correct, not a problem to optimise away. Never
try to statically cache a page whose content depends on the viewer.

The public leaderboard is the one page with no per-user content. It can be revalidated
on a timer rather than rebuilt per request:

```ts
export const revalidate = 60;
```

Do not add that to anything under `/dashboard` or `/admin`.

## Environment variables

`NEXT_PUBLIC_*` is inlined into the browser bundle at build time. Only the project URL
and the anon key carry that prefix. Any other name stays server-only.

The anon key is *meant* to be public — it grants nothing on its own, because RLS
decides what the bearer can see. That is why the policies matter so much and why a
service-role key in a `NEXT_PUBLIC_` variable would hand the whole database to every
visitor.

New variables get added to `.env.example` with a placeholder value in the same commit,
so the required set is always discoverable without opening `.env`.

## Errors and states

Give every route segment an `error.tsx` and a `loading.tsx`. Supabase errors are
returned, not thrown — `const { data, error } = await ...` and handling `error` on
every call is not optional. An unchecked `data` is `null` far more often than you
expect, most commonly because RLS filtered the row out.
