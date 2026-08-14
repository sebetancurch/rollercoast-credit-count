"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fieldErrors, signInSchema, signUpSchema } from "@/lib/validation";

/**
 * Authentication.
 *
 * A server action is a public HTTP endpoint, so every payload is parsed before
 * it is used and nothing here accepts an argument saying who is acting.
 *
 * The role is conspicuously absent from the signup path. It is set by the
 * on_auth_user_created trigger, which hardcodes 'enthusiast' and ignores the
 * user metadata entirely — a signup payload is client-controlled, so honouring
 * a role from it would hand out admin on request.
 */

export type AuthState = {
  errors?: Record<string, string>;
  /** Set when signup succeeded but the project requires email confirmation. */
  checkEmail?: string;
} | null;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // An unconfirmed account is called out separately. Collapsing it into the
    // generic message tells someone their password is wrong when it is not, and
    // leaves them with no way forward. It leaks nothing either: whoever created
    // the account already knows it exists.
    if (isUnconfirmed(error)) {
      return {
        errors: {
          _:
            "That account still needs confirming. Check your inbox for the " +
            "confirmation link, then sign in.",
        },
      };
    }

    // Everything else gets one message. Distinguishing "no such account" from
    // "wrong password" tells an attacker which emails are registered.
    return { errors: { _: "Email or password not recognised." } };
  }

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the trigger to name the profile. Only the display name — the
      // trigger ignores anything else that arrives here.
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    return {
      errors: {
        _:
          error.message.toLowerCase().includes("already")
            ? "That email already has an account. Try signing in."
            : "Could not create that account.",
      },
    };
  }

  // With email confirmation enabled — the default on a hosted project — signUp
  // returns no session: the account exists and the profile trigger has run, but
  // nothing is signed in until the link is followed. Redirecting to /dashboard
  // here would bounce straight back to /login with no explanation.
  if (!data.session) {
    return { checkEmail: parsed.data.email };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * GoTrue reports an unconfirmed account as `email_not_confirmed`. Older
 * versions only set the message, so both are checked.
 */
function isUnconfirmed(error: { code?: string; message: string }): boolean {
  return (
    error.code === "email_not_confirmed" ||
    error.message.toLowerCase().includes("not confirmed")
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
