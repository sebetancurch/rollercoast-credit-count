"use client";

import { ErrorView } from "@/components/error-view";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorView
      title="Your dashboard could not be loaded"
      digest={error.digest}
      onRetry={retry}
    >
      Nothing in your ride history has changed.
    </ErrorView>
  );
}
