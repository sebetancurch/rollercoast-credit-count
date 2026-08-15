"use client";

/**
 * The fallback every error boundary renders.
 *
 * One component rather than the same markup copied into each error.tsx, so the
 * wording, the digest line and the recovery button stay consistent — and so
 * there is one place to get the recovery semantics right.
 *
 * On `retry` vs `reset`: Next 16 hands an error boundary both. `reset()` only
 * clears the boundary's state and re-renders its children from what is already
 * there; `retry()` re-fetches first. Every boundary in this app is catching a
 * failed server-component read, so `reset()` re-renders the same failure and
 * throws again — the button looks broken. Pass `retry`.
 *
 * Nothing here shows `error.message`. In production Next replaces the message
 * from a server component with a generic one anyway, and the digest is what
 * actually matches a line in the server log.
 */
export function ErrorView({
  title,
  children,
  digest,
  onRetry,
  /** h1 when this replaces a whole page, h2 when it sits inside a section. */
  level = "h2",
}: {
  title: string;
  children: React.ReactNode;
  digest?: string;
  onRetry?: () => void;
  level?: "h1" | "h2";
}) {
  const Heading = level;

  return (
    <div className="cc-page" style={{ maxWidth: "52ch" }}>
      <Heading>{title}</Heading>
      <p className="cc-prose cc-prose--lg">{children}</p>

      {digest ? (
        <p className="text-muted" style={{ fontSize: 12 }}>
          Reference {digest}
        </p>
      ) : null}

      {onRetry ? (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
