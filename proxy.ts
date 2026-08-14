import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Session refresh, plus a convenience redirect.
 *
 * Server Components cannot write cookies, so without this the auth token
 * expires and never renews.
 *
 * The redirect is a courtesy — it keeps a signed-out visitor off a page that
 * would only show them an error. It is not a security boundary. RLS is: an
 * admin has no policy on `ride` at all, so a request that skips this file
 * entirely still returns nothing.
 *
 * Named `proxy` in `proxy.ts`: Next 16 renamed the middleware file convention.
 * The helper it calls is still lib/supabase/middleware.ts, which is a plain
 * module and unaffected.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
