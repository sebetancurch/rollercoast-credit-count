"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="cc-page" style={{ maxWidth: "52ch" }}>
      <h1>Something went wrong</h1>
      <p className="cc-prose cc-prose--lg">
        That page could not be loaded. Nothing you have logged has been changed.
      </p>
      {error.digest ? (
        <p className="text-muted" style={{ fontSize: 12 }}>
          Reference {error.digest}
        </p>
      ) : null}
      <button type="button" className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
