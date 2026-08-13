"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LogRideDialog } from "@/components/log-ride-dialog";
import type { Coaster } from "@/lib/types";

/**
 * "Log a ride" is reachable from the nav, the dashboard, the ride history and a
 * coaster's own page. Rather than four copies of the dialog, one lives in the
 * dashboard layout and `?log=1` opens it — so the button is a plain link, the
 * open dialog survives a refresh, and Back closes it.
 */
function Launcher({
  coasters,
  rideCounts,
}: {
  coasters: Coaster[];
  rideCounts: Record<string, number>;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const open = params.get("log") === "1";
  const coasterId = params.get("coaster");
  const initialCoaster = coasterId ? (coasters.find((c) => c.id === coasterId) ?? null) : null;

  function close() {
    const next = new URLSearchParams(params);
    next.delete("log");
    next.delete("coaster");
    const query = next.toString();
    // Rebuilt from the URL we are already on, so typedRoutes cannot check it.
    router.replace((query ? `${pathname}?${query}` : pathname) as Route);
  }

  return (
    <LogRideDialog
      // Remount per opening so the two-step state starts clean each time.
      key={`${open}-${coasterId ?? ""}`}
      open={open}
      onClose={close}
      coasters={coasters}
      rideCounts={rideCounts}
      initialCoaster={initialCoaster}
    />
  );
}

export function LogRideLauncher(props: {
  coasters: Coaster[];
  rideCounts: Record<string, number>;
}) {
  // useSearchParams suspends during prerender; the dialog has nothing to show
  // until it resolves anyway.
  return (
    <Suspense fallback={null}>
      <Launcher {...props} />
    </Suspense>
  );
}
