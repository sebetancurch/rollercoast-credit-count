"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="cc-page" style={{ maxWidth: "52ch" }}>
      <h2>Your dashboard could not be loaded</h2>
      <p className="cc-prose cc-prose--lg">
        Nothing in your ride history has changed.
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
