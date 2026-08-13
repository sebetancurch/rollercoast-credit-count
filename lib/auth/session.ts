/**
 * The session seam.
 *
 * Every server component, layout guard and server action reads the current user
 * from here and nowhere else. Today the mock branch reads a cookie set by the
 * dev role switcher; in step 2 the real branch below takes over and no caller
 * changes.
 *
 * The real branch uses `getUser()`, never `getSession()`: getSession trusts a
 * cookie the client can write, getUser revalidates the JWT with the Auth
 * server. Every authorization decision on the server must come from getUser().
 */

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROLE_COOKIE } from "@/lib/auth/roles";
import { isMockMode } from "@/lib/env";
import {
  MOCK_ADMIN_ID,
  MOCK_ADMIN_NAME,
  MOCK_ENTHUSIAST_ID,
  MOCK_ENTHUSIAST_NAME,
} from "@/lib/mock/fixtures";
import { store } from "@/lib/mock/store";
// import { createClient } from "@/lib/supabase/server";  // step 2
import type { CurrentUser } from "@/lib/types";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isMockMode) return mockUser();

  // ── step 2 ───────────────────────────────────────────────────────────────
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return null;
  //
  // const { data: profile, error } = await supabase
  //   .from("profiles")
  //   .select("username, role, leaderboard_opt_in")
  //   .eq("id", user.id)
  //   .single();
  // if (error || !profile) return null;
  //
  // return {
  //   id: user.id,
  //   displayName: profile.username,
  //   role: profile.role,
  //   leaderboardOptIn: profile.leaderboard_opt_in,
  // };
  throw new Error(
    "Real Supabase sessions are not wired up yet. Leave USE_MOCK_DATA=true until step 2.",
  );
}

async function mockUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const role = jar.get(ROLE_COOKIE)?.value ?? "visitor";
  if (role !== "enthusiast" && role !== "admin") return null;

  const id = role === "admin" ? MOCK_ADMIN_ID : MOCK_ENTHUSIAST_ID;
  const profile = store().profiles[id];

  return {
    id,
    displayName:
      profile?.displayName ??
      (role === "admin" ? MOCK_ADMIN_NAME : MOCK_ENTHUSIAST_NAME),
    role,
    leaderboardOptIn: profile?.leaderboardOptIn ?? false,
  };
}

/**
 * Layout and action guards.
 *
 * These redirect, which is a convenience for the person browsing — not a
 * security control. The control is RLS: an admin gets no policy on `ride` at
 * all, so even a hand-crafted request returns nothing. Until step 2 writes
 * those policies, these guards are all there is, and they are not enough.
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
