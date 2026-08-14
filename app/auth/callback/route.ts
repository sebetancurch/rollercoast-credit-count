import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth code exchange — where a confirmation link lands.
 *
 * This has to be a route handler rather than a server action: it is a GET the
 * mail client follows, not a form post.
 *
 * @supabase/ssr uses the PKCE flow, so the link arrives with a `code` that has
 * to be traded for a session. Without that exchange the browser lands here with
 * a valid code, nothing happens, and the user is bounced to /login looking as
 * though confirmation failed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Supabase appends these when it refuses the link — expired, already used, or
  // a redirect target that is not on the project's allow-list.
  const authError = searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError)}`,
    );
  }

  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That confirmation link is no longer valid.")}`,
    );
  }

  // Only ever redirect to a path on this origin. `next` arrives in the URL, so
  // treating it as a full URL would make this an open redirect.
  const next = searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return NextResponse.redirect(`${origin}${target}`);
}
