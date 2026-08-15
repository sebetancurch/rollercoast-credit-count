"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";

/**
 * Sign in / sign up. One component, two routes: the segmented control is a pair
 * of links rather than local state so each mode has its own URL.
 *
 * Validation runs in the server action, not here — the action is a public
 * endpoint and is the only place a check counts. These messages are whatever it
 * sends back.
 */

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
      {pending ? "Working…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  notice,
}: {
  mode: "signin" | "signup";
  /** A message carried in from the auth callback, e.g. an expired link. */
  notice?: string;
}) {
  const isSignUp = mode === "signup";
  const [state, formAction] = useActionState<AuthState, FormData>(
    isSignUp ? signUp : signIn,
    null,
  );
  const errors = state?.errors ?? {};

  // Signup succeeded but the project requires email confirmation, so there is
  // no session to redirect with. Say so rather than bouncing to a login page
  // that looks like the signup failed.
  if (state?.checkEmail) {
    return (
      <div className="cc-split cc-split--auth">
        <div className="cc-empty" style={{ marginTop: 0 }}>
          <h1 style={{ fontSize: 38, marginBottom: "var(--space-4)" }}>
            Check your email
          </h1>
          <p className="cc-prose cc-prose--lg">
            Your account is created. We sent a confirmation link to{" "}
            <strong>{state.checkEmail}</strong> — follow it and you can sign in.
          </p>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Nothing is logged against your account until you do.
          </p>
          <Link href="/login" className="btn btn-secondary">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-split cc-split--auth">
      <div>
        <h1 style={{ fontSize: 38, marginBottom: "var(--space-4)" }}>
          {isSignUp ? "Start your credit count" : "Welcome back"}
        </h1>

        <div className="seg" style={{ marginBottom: "var(--space-3)" }}>
          <Link
            href="/login"
            className="seg-opt"
            aria-current={!isSignUp ? "page" : undefined}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="seg-opt"
            aria-current={isSignUp ? "page" : undefined}
          >
            Sign up
          </Link>
        </div>

        {/* Above the form, not under the submit button. Under the button it
            shared a slot with the red validation messages, so a note about how
            sign-in works read as the reason the last attempt had failed. */}
        <p className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-6)" }}>
          {isSignUp
            ? "An email address, a password and a display name is all it takes."
            : "Sign in with the email address and password you signed up with."}
        </p>

        <form action={formAction} className="cc-stack" noValidate>
          {isSignUp ? (
            <div className="field">
              <label htmlFor="cc-name">Display name</label>
              <input
                className="input"
                id="cc-name"
                name="displayName"
                autoComplete="nickname"
                placeholder="How you appear on the leaderboard"
                aria-invalid={errors.displayName ? true : undefined}
                aria-describedby="cc-name-error"
              />
              <div className="cc-field-error" id="cc-name-error">
                {errors.displayName}
              </div>
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="cc-email">Email</label>
            <input
              className="input"
              id="cc-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby="cc-email-error"
            />
            <div className="cc-field-error" id="cc-email-error">
              {errors.email}
            </div>
          </div>

          <div className="field">
            <label htmlFor="cc-pass">Password</label>
            <input
              className="input"
              id="cc-pass"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="At least 8 characters"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby="cc-pass-error"
            />
            <div className="cc-field-error" id="cc-pass-error">
              {errors.password}
            </div>
          </div>

          {errors._ || notice ? (
            <div className="cc-field-error" role="alert">
              {errors._ ?? notice}
            </div>
          ) : null}

          <Submit label={isSignUp ? "Create account" : "Sign in"} />
        </form>
      </div>

      <div style={{ paddingTop: "var(--space-6)", maxWidth: "44ch" }}>
        <p className="cc-eyebrow">Private by default</p>
        <p className="cc-prose cc-prose--lg" style={{ marginBottom: 30 }}>
          Your ride history — which coasters, which dates, your notes — is visible to you
          and nobody else. Not other enthusiasts, not admins.
        </p>
        <p className="cc-eyebrow">The leaderboard is a choice</p>
        <p className="cc-prose cc-prose--lg">
          You start off it. One switch on your dashboard puts your display name and credit
          count on the public board, and the same switch takes them off again.
        </p>
      </div>
    </div>
  );
}
