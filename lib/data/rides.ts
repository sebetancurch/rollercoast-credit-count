/**
 * Ride history reads — the private half of the product.
 *
 * Every function takes the user id explicitly and filters on it. Under RLS that
 * filter is redundant: the policies scope every statement to the caller anyway,
 * and the tests prove it. It stays because a query that says who it is for is
 * easier to review than one that relies on the reader knowing about a policy,
 * and because a missing filter would then be a visible bug rather than an
 * invisible dependence on the database being configured correctly.
 */

import "server-only";

import { RIDE_SELECT } from "@/lib/data/selects";
import { createClient } from "@/lib/supabase/server";
import { computeDashboardStats, type DashboardStats } from "@/lib/stats";
import type { RideWithCoaster } from "@/lib/types";

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
  const supabase = await createClient();

  let query = supabase
    .from("ride")
    .select(RIDE_SELECT)
    .eq("user_id", userId)
    .order("ridden_on", { ascending: false })
    // A stable second key, so two rides on the same day keep their order
    // between renders.
    .order("id", { ascending: false });

  if (filters.coasterId) query = query.eq("coaster_id", filters.coasterId);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RideWithCoaster[];

  // Applied here rather than as an embedded filter: it spans four columns of
  // the joined coaster, and the rows are already scoped to one user.
  const q = filters.query?.trim().toLowerCase() ?? "";
  if (!q) return rows;

  return rows.filter((ride) =>
    `${ride.coaster.name} ${ride.coaster.park} ${ride.coaster.country} ${ride.coaster.manufacturer}`
      .toLowerCase()
      .includes(q),
  );
}

export async function getRide(
  userId: string,
  rideId: string,
): Promise<RideWithCoaster | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ride")
    .select(RIDE_SELECT)
    .eq("user_id", userId)
    .eq("id", rideId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as RideWithCoaster | null) ?? null;
}

/**
 * The dashboard's whole numbers, derived from the ride list on every call.
 *
 * No stored count anywhere, per CLAUDE.md §3. The ride-history page needs every
 * row regardless, so one joined select serves both and there is nothing that
 * can drift. If this ever gets slow the fix is an index or a definer function —
 * never a stored column.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  return computeDashboardStats(await listRides(userId));
}

/** Ride counts per coaster id, for the "Ridden 3×" / "New credit" badges. */
export async function getRideCountsByCoaster(
  userId: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ride")
    .select("coaster_id")
    .eq("user_id", userId);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.coaster_id] = (counts[row.coaster_id] ?? 0) + 1;
  }
  return counts;
}
