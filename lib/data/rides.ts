/**
 * Ride history reads — the private half of the product.
 *
 * Every function takes the user id explicitly and filters on it. In step 2 that
 * filter becomes redundant, because RLS scopes the query to the caller anyway;
 * keeping it here means the mock behaves the same way the database will, and it
 * documents that no read is ever unscoped.
 */

import "server-only";

import { isMockMode } from "@/lib/env";
import { store } from "@/lib/mock/store";
import { computeDashboardStats, type DashboardStats } from "@/lib/stats";
import type { RideWithCoaster } from "@/lib/types";

function joinCoaster(userId: string): RideWithCoaster[] {
  if (!isMockMode) {
    throw new Error("Supabase ride reads are not wired up yet (step 2).");
  }
  const s = store();
  const byId = new Map(s.coasters.map((c) => [c.id, c]));

  return s.rides
    .filter((r) => r.user_id === userId)
    .flatMap((r) => {
      const coaster = byId.get(r.coaster_id);
      // A coaster removed from the catalogue orphans its rides. The database
      // will decide this with a foreign key; here we simply drop them.
      return coaster ? [{ ...r, coaster: { ...coaster } }] : [];
    });
}

/** Newest first — every ride list in the design is reverse-chronological. */
function byDateDesc(a: RideWithCoaster, b: RideWithCoaster): number {
  if (a.ridden_on !== b.ridden_on) return a.ridden_on < b.ridden_on ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

export type RideFilters = {
  /** Matches coaster name, park, country or manufacturer. */
  query?: string;
  /** Only rides on this coaster. */
  coasterId?: string;
  limit?: number;
};

export async function listRides(
  userId: string,
  filters: RideFilters = {},
): Promise<RideWithCoaster[]> {
  // Step 2: supabase.from("ride").select("*, coaster:coasters(*)")
  //         .order("ridden_on", { ascending: false })
  const q = filters.query?.trim().toLowerCase() ?? "";

  const rows = joinCoaster(userId)
    .filter((r) => {
      if (filters.coasterId && r.coaster_id !== filters.coasterId) return false;
      if (!q) return true;
      const c = r.coaster;
      return `${c.name} ${c.park} ${c.country} ${c.manufacturer}`
        .toLowerCase()
        .includes(q);
    })
    .sort(byDateDesc);

  return filters.limit ? rows.slice(0, filters.limit) : rows;
}

export async function getRide(
  userId: string,
  rideId: string,
): Promise<RideWithCoaster | null> {
  return joinCoaster(userId).find((r) => r.id === rideId) ?? null;
}

/**
 * The dashboard's whole numbers, derived from the ride list on every call.
 * No stored count, per CLAUDE.md §3 — see lib/stats.ts.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  return computeDashboardStats(joinCoaster(userId));
}

/** Ride counts per coaster id, for the "Ridden 3×" / "New credit" badges. */
export async function getRideCountsByCoaster(
  userId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const ride of joinCoaster(userId)) {
    counts[ride.coaster_id] = (counts[ride.coaster_id] ?? 0) + 1;
  }
  return counts;
}
