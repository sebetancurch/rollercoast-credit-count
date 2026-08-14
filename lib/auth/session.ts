/**
 * The session.
 *
 * Every server component, layout guard and server action reads the current user
 * from here and nowhere else.
 *
 * `getUser()`, never `getSession()`. getSession reads the session out of a
 * cookie the client can write and returns it without checking whether it is
 * genuine; getUser revalidates the JWT with the Auth server. Every
 * authorization decision on the server has to come from getUser().
 */

import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/types";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS scopes this to the caller's own row; the eq() is belt and braces, and
  // documents that no read here is ever unscoped.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, role, leaderboard_opt_in")
    .eq("id", user.id)
    .single();

  // A signed-in user with no profile row should be impossible — the
  // on_auth_user_created trigger creates it — so treat it as signed out rather
  // than inventing a default.
  if (error || !profile) return null;

  return {
    id: user.id,
    displayName: profile.username,
    role: profile.role,
    leaderboardOptIn: profile.leaderboard_opt_in,
  };
}

/**
 * Layout and action guards.
 *
 * These redirect, which is a convenience for the person browsing — not the
 * security control. The control is RLS: an admin has no policy on `ride` at
 * all, so even a hand-crafted request returns nothing. See
 * supabase/tests/ride_rls.test.sql and tests/rls/.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireEnthusiast(): Promise<CurrentUser> {
  const user = await requireUser();
  // Admins have no dashboard and no ride history — those belong to enthusiasts.
  if (user.role !== "enthusiast") redirect("/admin/coasters");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
