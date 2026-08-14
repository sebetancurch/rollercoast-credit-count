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
      {/* Three tiles joined at a 2px seam: the credit count carries the ink. */}
      <div className="cc-tiles">
        <div className="cc-tile cc-tile--feature">
          <p className="cc-eyebrow cc-eyebrow--on-dark">Credits</p>
          <div className="cc-headline-number">{stats.credits}</div>
          <p className="cc-tile-note">Unique coasters ridden at least once</p>
        </div>

        <div className="cc-tile">
          <p className="cc-eyebrow cc-eyebrow--muted">Total rides</p>
          <div className="cc-stat-number">{stats.totalRides}</div>
          <p className="cc-tile-note">
            {stats.repeatCoasters > 0
              ? `${stats.repeatCoasters} coasters ridden more than once`
              : "No repeat rides yet"}
          </p>
        </div>

        <div className="cc-tile">
          <p className="cc-eyebrow cc-eyebrow--muted">Most ridden</p>
          <div className="cc-stat-number cc-stat-number--sm">
            {stats.mostRidden?.coaster.name ?? "—"}
          </div>
          <p className="cc-tile-note">
            {stats.mostRidden
              ? `${plural(stats.mostRidden.rides, "ride")} · ${stats.mostRidden.coaster.park}`
              : "Log a ride to see this"}
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginTop: 34,
          maxWidth: 680,
          display: "flex",
          gap: 28,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "24px 28px",
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <h4 style={{ fontSize: 22, lineHeight: 1.1, marginBottom: 6 }}>
            Make your credit count public?
          </h4>
          <p
            style={{
              fontSize: 13,
              maxWidth: "52ch",
              textWrap: "pretty",
              margin: 0,
              color: "var(--color-ink-65)",
            }}
          >
            Off by default. When on, the leaderboard shows your display name and credit
            count — nothing else. Your rides and notes stay private either way.
          </p>
        </div>
        <OptInToggle optIn={user.leaderboardOptIn} />
      </div>

      {stats.totalRides === 0 ? (
        <div className="cc-empty">
          <h3>Nothing logged yet</h3>
          <p className="cc-prose cc-prose--lg" style={{ marginBottom: 22 }}>
            Search the shared catalogue, pick a coaster, add the date you rode it. That
            first entry becomes credit number one, and your stats appear here — by
            country, by manufacturer, by type.
          </p>
          <Link href="/dashboard?log=1" className="btn btn-primary btn-lg">
            Log your first ride
          </Link>
        </div>
      ) : (
        <>
          <div className="cc-breakdowns">
            <section className="cc-panel">
              <p className="cc-eyebrow">Credits by country</p>
              <CreditMap counts={stats.countryCounts} />
              <CountryLegend rows={stats.byCountry} />
            </section>

            <section className="cc-panel">
              <p className="cc-eyebrow">Credits by manufacturer</p>
              <BreakdownBars rows={stats.byManufacturer} />
            </section>

            <section className="cc-panel">
              <p className="cc-eyebrow">Credits by type</p>
              <BreakdownBars rows={stats.byType} />
              <p
                style={{
                  fontSize: 12,
                  margin: "22px 0 0",
                  textWrap: "pretty",
                  color: "var(--color-ink-55)",
                }}
              >
                Stats recalculate from your ride history as you log, edit or delete rides.
              </p>
            </section>
          </div>

          <section style={{ marginTop: 34 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 20,
                marginBottom: 12,
              }}
            >
              <p className="cc-eyebrow" style={{ margin: 0 }}>
                Latest rides
              </p>
              <Link
                href="/dashboard/rides"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                All {plural(stats.totalRides, "ride")} →
              </Link>
            </div>

            <div className="cc-scroll-x">
              <table className="table">
                <caption className="cc-note" style={{ captionSide: "bottom", textAlign: "left" }}>
                  Your five most recent rides. Visible to you and nobody else.
                </caption>
                <tbody>
                  {latest.map((ride) => (
                    <tr key={ride.id}>
                      <td className="cc-nowrap cc-tabnum" style={{ width: 130 }}>
                        {formatDate(ride.ridden_on)}
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/coasters/${ride.coaster_id}`}
                          className="cc-row-title"
                        >
                          {ride.coaster.name}
                        </Link>
                      </td>
                      <td>{ride.coaster.park}</td>
                      <td>{ride.note ?? "—"}</td>
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
