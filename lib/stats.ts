/**
 * Derived statistics.
 *
 * CLAUDE.md §3: credits are never stored. A credit is
 * `count(distinct coaster_id)` and a ride total is `count(*)`, computed at read
 * time — here in the mock, and by SQL once the database exists. Nothing in this
 * file caches, and nothing anywhere writes a credit total to a field.
 *
 * These are pure functions over a ride list, which is what makes them the unit
 * tests' target (tests/unit/stats.test.ts).
 */

import type { Coaster, RideWithCoaster } from "@/lib/types";

export type Breakdown = {
  label: string;
  /** Credits — distinct coasters — in this group, not rides. */
  n: number;
  /** Share of the largest group, 0–100, for the bar widths. */
  pct: number;
};

export type DashboardStats = {
  credits: number;
  totalRides: number;
  /** Coasters ridden more than once. Drives "N coasters ridden more than once". */
  repeatCoasters: number;
  mostRidden: { coaster: Coaster; rides: number } | null;
  byCountry: Breakdown[];
  byManufacturer: Breakdown[];
  byType: Breakdown[];
  /** Credits keyed by country name, for the choropleth. */
  countryCounts: Record<string, number>;
};

/** How many times each coaster was ridden, keyed by coaster id. */
export function ridesPerCoaster(rides: RideWithCoaster[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ride of rides) {
    counts.set(ride.coaster_id, (counts.get(ride.coaster_id) ?? 0) + 1);
  }
  return counts;
}

/** A credit is one coaster ridden at least once, however many times. */
export function creditCount(rides: RideWithCoaster[]): number {
  return ridesPerCoaster(rides).size;
}

export function rideCount(rides: RideWithCoaster[]): number {
  return rides.length;
}

/** One coaster per credit, so a coaster ridden seven times counts once. */
function uniqueCoasters(rides: RideWithCoaster[]): Coaster[] {
  const seen = new Map<string, Coaster>();
  for (const ride of rides) {
    if (!seen.has(ride.coaster_id)) seen.set(ride.coaster_id, ride.coaster);
  }
  return [...seen.values()];
}

/**
 * Credits grouped by one coaster attribute, largest first, ties broken
 * alphabetically so the order is stable across renders.
 */
export function groupCreditsBy(
  rides: RideWithCoaster[],
  key: "country" | "manufacturer" | "type",
): Breakdown[] {
  const totals = new Map<string, number>();
  for (const coaster of uniqueCoasters(rides)) {
    const label = coaster[key];
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }

  const rows = [...totals.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));

  const max = rows.length > 0 ? rows[0].n : 1;
  return rows.map((row) => ({ ...row, pct: Math.round((row.n / max) * 100) }));
}

/** The most-ridden coaster, ties broken by name so the answer is deterministic. */
export function mostRiddenCoaster(
  rides: RideWithCoaster[],
): { coaster: Coaster; rides: number } | null {
  const counts = ridesPerCoaster(rides);
  const byId = new Map(rides.map((r) => [r.coaster_id, r.coaster]));

  let best: { coaster: Coaster; rides: number } | null = null;
  for (const [coasterId, n] of counts) {
    const coaster = byId.get(coasterId);
    if (!coaster) continue;
    if (
      !best ||
      n > best.rides ||
      (n === best.rides && coaster.name.localeCompare(best.coaster.name) < 0)
    ) {
      best = { coaster, rides: n };
    }
  }
  return best;
}

export function computeDashboardStats(rides: RideWithCoaster[]): DashboardStats {
  const perCoaster = ridesPerCoaster(rides);
  const byCountry = groupCreditsBy(rides, "country");

  const countryCounts: Record<string, number> = {};
  for (const row of byCountry) countryCounts[row.label] = row.n;

  return {
    credits: perCoaster.size,
    totalRides: rides.length,
    repeatCoasters: [...perCoaster.values()].filter((n) => n > 1).length,
    mostRidden: mostRiddenCoaster(rides),
    byCountry,
    byManufacturer: groupCreditsBy(rides, "manufacturer"),
    byType: groupCreditsBy(rides, "type"),
    countryCounts,
  };
}

/**
 * The 4-step accent ramp the design uses for the choropleth and its legend.
 * Kept next to the stats because the bucket boundaries are a statistic.
 */
export const CHOROPLETH_RAMP = ["#cbeeff", "#99e0ff", "#38a6cf", "#006786"] as const;
export const CHOROPLETH_EMPTY = "#dedbdb";

export function choroplethColor(n: number, max: number): string {
  if (!n) return CHOROPLETH_EMPTY;
  if (max <= 1) return CHOROPLETH_RAMP[3];
  const t = n / max;
  if (t <= 0.25) return CHOROPLETH_RAMP[0];
  if (t <= 0.5) return CHOROPLETH_RAMP[1];
  if (t <= 0.75) return CHOROPLETH_RAMP[2];
  return CHOROPLETH_RAMP[3];
}

/**
 * Catalogue duplicate detection — same name and park, ignoring case and
 * punctuation. Surfaces the "Icon" / "ICON" pair an admin should merge.
 */
export function duplicateKey(coaster: Pick<Coaster, "name" | "park">): string {
  return `${coaster.name}|${coaster.park}`.toLowerCase().replace(/[^a-z0-9|]/g, "");
}

export function duplicateIds(coasters: Coaster[]): Set<string> {
  const counts = new Map<string, number>();
  for (const c of coasters) {
    const key = duplicateKey(c);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    coasters.filter((c) => (counts.get(duplicateKey(c)) ?? 0) > 1).map((c) => c.id),
  );
}
