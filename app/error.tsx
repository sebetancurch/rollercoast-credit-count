"use client";

import { ErrorView } from "@/components/error-view";

/**
 * The root segment's boundary. Catches anything thrown by a page under `/`
 * that has no closer error.tsx — the leaderboard, most obviously.
 *
 * It does NOT catch a failure in the root layout itself; that is what
 * app/global-error.tsx is for.
 */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorView level="h1" title="Something went wrong" digest={error.digest} onRetry={retry}>
      That page could not be loaded. Nothing you have logged has been changed.
    </ErrorView>
  );
}
