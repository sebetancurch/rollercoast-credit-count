"use client";

import { ErrorView } from "@/components/error-view";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorView title="The catalogue could not be loaded" digest={error.digest} onRetry={retry}>
      No coasters have been changed.
    </ErrorView>
  );
}
