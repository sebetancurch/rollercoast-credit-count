import { NextResponse, type NextRequest } from "next/server";

import { ROLE_COOKIE } from "@/lib/auth/roles";
import { isMockMode } from "@/lib/env";
import { isProtected, updateSession } from "@/lib/supabase/middleware";

/**
 * A convenience redirect, not a security boundary.
 *
 * It keeps a signed-out visitor from landing on a page that would only show
 * them an error. What actually stops one user reaching another's data is RLS in
 * the database — and that does not exist yet, which is exactly why nothing in
 * this step should be described as enforcing privacy.
 *
 * Named `proxy` in `proxy.ts`: Next 16 renamed the middleware file convention
 * and warns on the old one. The helper it calls is still
 * lib/supabase/middleware.ts, which is a plain module and unaffected.
 */
export async function proxy(request: NextRequest) {
  if (!isMockMode) return updateSession(request);

  const { pathname } = request.nextUrl;
  const role = request.cookies.get(ROLE_COOKIE)?.value;

  // Sending a signed-in user away from the auth pages belongs here rather than
  // in the page: this runs before anything renders, so it is a real 307 instead
  // of a flash of the sign-in form followed by a client-side navigation.
  if (pathname === "/login" || pathname === "/signup") {
    if (role === "enthusiast") return NextResponse.redirect(new URL("/dashboard", request.url));
    if (role === "admin") return NextResponse.redirect(new URL("/admin/coasters", request.url));
    return NextResponse.next();
  }

  if (!isProtected(pathname)) return NextResponse.next();

  if (!role || role === "visitor") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname.startsWith("/dashboard") && role !== "enthusiast") {
    return NextResponse.redirect(new URL("/admin/coasters", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
