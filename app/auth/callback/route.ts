import { NextResponse, type NextRequest } from "next/server";

// import { createClient } from "@/lib/supabase/server";

/**
 * Auth code exchange.
 *
 * v1 is email and password only, so the only thing that will land here is an
 * email-confirmation link. The handler is scaffolded now because it is the one
 * piece of auth that cannot be a server action — it has to be a GET the mail
 * client can follow.
 *
 * Inert until step 2: with no Supabase project there is no code to exchange.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next") ?? "/dashboard";

  // Step 2:
  // const code = searchParams.get("code");
  // if (code) {
  //   const supabase = await createClient();
  //   const { error } = await supabase.auth.exchangeCodeForSession(code);
  //   if (!error) return NextResponse.redirect(`${origin}${next}`);
  // }
  // return NextResponse.redirect(`${origin}/login?error=auth`);

  void next;
  return NextResponse.redirect(`${origin}/login`);
}
