"use client";

import Link from "next/link";

/**
 * Sign in / sign up.
 *
 * Deliberately not the shared ErrorView: this boundary catches a failure in the
 * page around the form, and offering "Try again" would re-render the auth form
 * with whatever the user had typed already gone. A link back is the honest
 * affordance. Nothing here says whether an account exists.
 */
export default function AuthError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="cc-page" style={{ maxWidth: "52ch" }}>
      <h1>That did not work</h1>
      <p className="cc-prose cc-prose--lg">
        We could not load the sign-in page. No account has been created or changed.
      </p>
      {error.digest ? (
        <p className="text-muted" style={{ fontSize: 12 }}>
          Reference {error.digest}
        </p>
      ) : null}
      <Link href="/login" className="btn btn-primary">
        Back to sign in
      </Link>
    </div>
  );
}
