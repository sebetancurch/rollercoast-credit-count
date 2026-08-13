"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HOME_FOR_ROLE, isMockRole, ROLE_COOKIE, type MockRole } from "@/lib/auth/roles";
import { isMockMode } from "@/lib/env";
import { MOCK_ENTHUSIAST_ID } from "@/lib/mock/fixtures";
import { setRideHistory, store } from "@/lib/mock/store";
import { fieldErrors, signInSchema, signUpSchema } from "@/lib/validation";

/**
 * Authentication.
 *
 * A server action is a public HTTP endpoint, so every payload is parsed before
 * it is used and nothing here ever accepts an argument saying who is acting.
 *
 * The mock branch sets a cookie. In step 2 the bodies become
 * supabase.auth.signInWithPassword / signUp and the profile insert — the forms,
 * the validation, the error copy and the redirects all stay as they are.
 */

export type AuthState = { errors: Record<string, string> } | null;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;

function assertMock() {
  if (!isMockMode) {
    throw new Error("Supabase Auth is not wired up yet. Leave USE_MOCK_DATA=true until step 2.");
  }
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  assertMock();
  // Step 2: const { error } = await supabase.auth.signInWithPassword(parsed.data);
  //         if (error) return { errors: { _: "Email or password not recognised." } };
  const jar = await cookies();
  jar.set(ROLE_COOKIE, "enthusiast", COOKIE_OPTIONS);
  setRideHistory(MOCK_ENTHUSIAST_ID, true);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  assertMock();
  // Step 2: supabase.auth.signUp, then insert the profile row with
  //         leaderboard_opt_in defaulting to false — private by default.
  const jar = await cookies();
  jar.set(ROLE_COOKIE, "enthusiast", COOKIE_OPTIONS);

  const s = store();
  const profile = s.profiles[MOCK_ENTHUSIAST_ID];
  if (profile) {
    profile.displayName = parsed.data.displayName;
    profile.leaderboardOptIn = false;
  }
  // A new account has no history.
  setRideHistory(MOCK_ENTHUSIAST_ID, false);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const jar = await cookies();
  // Step 2: await supabase.auth.signOut();
  jar.delete(ROLE_COOKIE);

  revalidatePath("/", "layout");
  redirect("/");
}

/* ── Mock-only, deleted in step 2 ───────────────────────────────────────── */

export async function setMockRole(role: MockRole) {
  assertMock();
  if (!isMockRole(role)) return;

  const jar = await cookies();
  if (role === "visitor") jar.delete(ROLE_COOKIE);
  else jar.set(ROLE_COOKIE, role, COOKIE_OPTIONS);

  revalidatePath("/", "layout");
  redirect(HOME_FOR_ROLE[role]);
}

export async function setMockRideHistory(seeded: boolean) {
  assertMock();
  setRideHistory(MOCK_ENTHUSIAST_ID, seeded);
  revalidatePath("/", "layout");
}
