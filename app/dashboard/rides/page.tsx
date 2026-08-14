import type { Metadata } from "next";

import { RidesView } from "@/components/rides-view";
import { requireEnthusiast } from "@/lib/auth/session";
import { getDashboardStats, listRides } from "@/lib/data/rides";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "My rides · Credit Count" };

export default async function RidesPage() {
  const user = await requireEnthusiast();
  const [rides, stats] = await Promise.all([
    listRides(user.id),
    getDashboardStats(user.id),
  ]);

  return (
    <div className="cc-page">
      <h1 style={{ fontSize: 40, marginBottom: "var(--space-2)" }}>My rides</h1>
      <p className="text-muted" style={{ fontSize: 14 }}>
        {plural(stats.totalRides, "ride")} · {plural(stats.credits, "credit")} · private to
        you
      </p>

      <RidesView rides={rides} />

      <p className="text-muted cc-note">
        Only you can see this page. You can edit or delete your own rides and nobody
        else&apos;s — enforced in the database, not just here.
      </p>
    </div>
  );
}
