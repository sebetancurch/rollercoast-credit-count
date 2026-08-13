import type { Metadata } from "next";
import Link from "next/link";

import { BreakdownBars, CountryLegend } from "@/components/breakdown-list";
import { CreditMap } from "@/components/credit-map";
import { OptInToggle } from "@/components/opt-in-toggle";
import { requireEnthusiast } from "@/lib/auth/session";
import { getDashboardStats, listRides } from "@/lib/data/rides";
import { formatDate, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard · Credit Count" };

/**
 * The enthusiast's own dashboard.
 *
 * Every number here is derived from the ride list at read time — credits are
 * distinct coasters, rides are rides, and neither is stored anywhere
 * (CLAUDE.md §3). Log, edit or delete a ride and all of it moves together
 * because there is nothing to keep in sync.
 */
export default async function DashboardPage() {
  const user = await requireEnthusiast();
  const [stats, latest] = await Promise.all([
    getDashboardStats(user.id),
    listRides(user.id, { limit: 5 }),
  ]);

  return (
    <div className="cc-page">
      <div className="cc-headline-row">
        <div>
          <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-3)" }}>
            Credits
          </h6>
          <div className="cc-headline-number">{stats.credits}</div>
          <p className="text-muted" style={{ marginTop: "var(--space-4)", fontSize: 14 }}>
            Unique coasters ridden at least once
          </p>
        </div>

        <div className="cc-stat-group">
          <div>
            <h6 className="cc-stat-label">Total rides</h6>
            <div className="cc-stat-number">{stats.totalRides}</div>
            <p className="text-muted" style={{ fontSize: 13, marginTop: "var(--space-2)" }}>
              {stats.repeatCoasters > 0
                ? `${stats.repeatCoasters} coasters ridden more than once`
                : "No repeat rides yet"}
            </p>
          </div>

          <div>
            <h6 className="cc-stat-label">Most ridden</h6>
            <div className="cc-stat-number cc-stat-number--sm">
              {stats.mostRidden?.coaster.name ?? "—"}
            </div>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 6 }}>
              {stats.mostRidden
                ? `${plural(stats.mostRidden.rides, "ride")} · ${stats.mostRidden.coaster.park}`
                : "Log a ride to see this"}
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-8)", maxWidth: 620 }}>
        <h5 style={{ marginBottom: 6 }}>Make your credit count public?</h5>
        <p
          className="text-muted"
          style={{ fontSize: 13, maxWidth: "52ch", textWrap: "pretty" }}
        >
          Off by default. When on, the leaderboard shows your display name and credit
          count — nothing else. Your rides and notes stay private either way.
        </p>
        <OptInToggle optIn={user.leaderboardOptIn} />
      </div>

      {stats.totalRides === 0 ? (
        <div className="cc-empty">
          <h3>Nothing logged yet</h3>
          <p className="cc-prose cc-prose--lg">
            Search the shared catalogue, pick a coaster, add the date you rode it. That
            first entry becomes credit number one, and your stats appear here — by
            country, by manufacturer, by type.
          </p>
          <Link href="/dashboard?log=1" className="btn btn-primary">
            Log your first ride
          </Link>
        </div>
      ) : (
        <>
          <div className="cc-breakdowns">
            <section>
              <h6 style={{ color: "var(--color-accent)" }}>Credits by country</h6>
              <CreditMap counts={stats.countryCounts} />
              <CountryLegend rows={stats.byCountry} />
            </section>

            <section>
              <h6 style={{ color: "var(--color-accent)" }}>Credits by manufacturer</h6>
              <BreakdownBars rows={stats.byManufacturer} />
            </section>

            <section>
              <h6 style={{ color: "var(--color-accent)" }}>Credits by type</h6>
              <BreakdownBars rows={stats.byType} />
              <p
                className="text-muted"
                style={{ fontSize: 12, marginTop: "var(--space-4)", textWrap: "pretty" }}
              >
                Stats recalculate from your ride history as you log, edit or delete rides.
              </p>
            </section>
          </div>

          <section style={{ marginTop: "var(--space-8)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "var(--space-4)",
              }}
            >
              <h6 style={{ color: "var(--color-accent)" }}>Latest rides</h6>
              <Link href="/dashboard/rides" style={{ fontSize: 13 }}>
                All {plural(stats.totalRides, "ride")}
              </Link>
            </div>

            <div className="cc-scroll-x">
              <table className="table">
                <caption className="text-muted" style={{ captionSide: "bottom", textAlign: "left", fontSize: 12, paddingTop: 10 }}>
                  Your five most recent rides. Visible to you and nobody else.
                </caption>
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Date</th>
                    <th>Coaster</th>
                    <th style={{ width: 190 }}>Park</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((ride) => (
                    <tr key={ride.id}>
                      <td className="cc-nowrap cc-tabnum">{formatDate(ride.ridden_on)}</td>
                      <td>
                        <Link href={`/dashboard/coasters/${ride.coaster_id}`} className="cc-num">
                          {ride.coaster.name}
                        </Link>
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {ride.coaster.park}
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {ride.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
