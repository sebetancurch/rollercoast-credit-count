import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { getDashboardStats } from "@/lib/data/rides";
import { formatDateLong, todayIso } from "@/lib/format";

/**
 * The public leaderboard — the visitor landing page, and the only page a
 * signed-out visitor can reach.
 *
 * Two columns come back from the data layer and two get rendered: a display
 * name and a credit count. Never which coasters anyone has ridden, never when,
 * never their notes.
 */
export default async function LeaderboardPage() {
  const [rows, user] = await Promise.all([getLeaderboard(15), getCurrentUser()]);

  // The nudge tells an enthusiast who is off the board how many credits are
  // being kept private, so it needs their own derived count.
  const stats =
    user?.role === "enthusiast" && !user.leaderboardOptIn
      ? await getDashboardStats(user.id)
      : null;

  return (
    <div className="cc-split">
      <div>
        <p className="cc-eyebrow">Public leaderboard · {formatDateLong(todayIso())}</p>
        <h1>Who has ridden the most</h1>
        <p className="cc-lede">
          A credit is one rollercoaster ridden at least once. Ride it again and your ride
          count goes up — your credit count does not. Everyone listed here chose to be.
        </p>

        <div className="cc-scroll-x">
          <table className="table table--bare">
            <caption className="cc-note" style={{ captionSide: "bottom", textAlign: "left" }}>
              Members who turned on public credits, ranked by credit count.
            </caption>
            <thead>
              <tr>
                <th style={{ width: 88 }}>Rank</th>
                <th>Display name</th>
                <th style={{ textAlign: "right" }}>Credits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isYou = user?.displayName === row.display_name && user.leaderboardOptIn;
                return (
                  <tr
                    key={`${row.display_name}-${index}`}
                    style={isYou ? { background: "var(--color-accent-100)" } : undefined}
                  >
                    <td
                      className="cc-num"
                      style={{
                        fontSize: 24,
                        lineHeight: 1,
                        color:
                          index === 0 ? "var(--color-accent-700)" : "var(--color-ink-62)",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
                      {row.display_name}
                      {isYou ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--color-accent-700)",
                            marginLeft: 10,
                          }}
                        >
                          You
                        </span>
                      ) : null}
                    </td>
                    <td
                      className="cc-num"
                      style={{
                        textAlign: "right",
                        fontSize: 22,
                        lineHeight: 1,
                        color: "var(--color-text)",
                      }}
                    >
                      {row.credit_count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="card">
        <p className="cc-eyebrow">What is shown here</p>
        <p className="cc-prose">
          Display name and credit count. Nothing else — not which coasters anyone has
          ridden, not when, not their notes.
        </p>

        {!user ? (
          <div className="cc-rail-section">
            <p className="cc-eyebrow">Start counting</p>
            <p className="cc-prose" style={{ marginBottom: 16 }}>
              Sign up with an email, a password and a display name. Your ride history is
              private by default.
            </p>
            <Link href="/signup" className="btn btn-primary btn-block">
              Create an account
            </Link>
          </div>
        ) : null}

        {stats && stats.credits > 0 ? (
          <div className="cc-rail-section">
            <p className="cc-eyebrow cc-eyebrow--danger">You are not listed</p>
            <p className="cc-prose" style={{ marginBottom: 16 }}>
              Your {stats.credits} credits stay private until you turn on public credits.
            </p>
            <Link href="/dashboard" className="btn btn-secondary">
              Open your dashboard
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
