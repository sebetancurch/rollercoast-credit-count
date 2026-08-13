import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoasterRides } from "@/components/coaster-rides";
import { requireEnthusiast } from "@/lib/auth/session";
import { getCoaster, getCoasterCommunityCounts } from "@/lib/data/coasters";
import { listRides } from "@/lib/data/rides";
import { formatDate } from "@/lib/format";

type Params = { params: Promise<{ coasterId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { coasterId } = await params;
  const coaster = await getCoaster(coasterId);
  return { title: coaster ? `${coaster.name} · Credit Count` : "Coaster · Credit Count" };
}

/**
 * One coaster, seen through this user's own rides.
 *
 * The catalogue half is public. The "your rides here" half is not, which is why
 * this page lives under /dashboard rather than beside the admin catalogue. The
 * community panel shows counts and nothing else: who rode it and when is never
 * exposed, here or anywhere.
 */
export default async function CoasterPage({ params }: Params) {
  const { coasterId } = await params;
  const user = await requireEnthusiast();

  const coaster = await getCoaster(coasterId);
  if (!coaster) notFound();

  const [mine, community] = await Promise.all([
    listRides(user.id, { coasterId }),
    getCoasterCommunityCounts(coasterId),
  ]);

  const span =
    mine.length === 0
      ? "Not ridden yet"
      : mine.length === 1
        ? `Ridden once, on ${formatDate(mine[0].ridden_on)}.`
        : `First ${formatDate(mine[mine.length - 1].ridden_on)}, most recently ${formatDate(mine[0].ridden_on)}. One credit, ${mine.length} rides.`;

  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      <Link href="/dashboard/rides" style={{ fontSize: 13 }}>
        ← My rides
      </Link>

      <h1 style={{ fontSize: 46, marginTop: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        {coaster.name}
      </h1>

      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          flexWrap: "wrap",
          marginBottom: "var(--space-8)",
        }}
      >
        <span className="tag tag-neutral">{coaster.park}</span>
        <span className="tag tag-neutral">{coaster.country}</span>
        <span className="tag tag-neutral">{coaster.manufacturer}</span>
        <span className="tag tag-outline">{coaster.type}</span>
      </div>

      <div className="cc-split cc-split--coaster">
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>Your rides here</h6>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--space-6)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div className="cc-stat-number cc-stat-number--md">{mine.length}</div>
            <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
              {span}
            </p>
          </div>

          <CoasterRides rides={mine} />

          <Link
            href={`/dashboard/coasters/${coaster.id}?log=1&coaster=${coaster.id}`}
            className="btn btn-primary"
            style={{ marginTop: "var(--space-4)" }}
          >
            {mine.length > 0 ? "Log another ride" : "Log a ride here"}
          </Link>
        </div>

        <aside>
          <h6 style={{ color: "var(--color-accent)" }}>Across the community</h6>
          <p className="cc-prose">
            <span className="cc-num">{community.members}</span> members have logged this
            coaster, <span className="cc-num">{community.rides}</span>{" "}
            {community.rides === 1 ? "ride" : "rides"} in total.
          </p>
          <p className="text-muted" style={{ fontSize: 12, textWrap: "pretty" }}>
            Counts only. Who rode it, and when, is never shown — on this page or anywhere
            else.
          </p>
        </aside>
      </div>
    </div>
  );
}
