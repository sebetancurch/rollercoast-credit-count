/**
 * Coaster catalogue reads.
 *
 * Part of the data seam: every function here keeps its signature in step 2 and
 * swaps its body for a Supabase query. The catalogue is world-readable, so
 * these are the only reads that will not be scoped by the caller's session.
 */

import "server-only";

import { isMockMode } from "@/lib/env";
import { store } from "@/lib/mock/store";
import { duplicateIds } from "@/lib/stats";
import type { Coaster } from "@/lib/types";

export type CoasterFilters = {
  /** Matches name, park, manufacturer or country. */
  query?: string;
  /** Exact country name, or undefined for all. */
  country?: string;
  /** Restrict to coasters sharing a name and park with another row. */
  duplicatesOnly?: boolean;
};

function mockCatalogue(): Coaster[] {
  if (!isMockMode) {
    throw new Error("Supabase catalogue reads are not wired up yet (step 2).");
  }
  return store().coasters;
}

export async function listCoasters(filters: CoasterFilters = {}): Promise<Coaster[]> {
  // Step 2: supabase.from("coasters").select("*").order("name")
  //         plus .ilike / .eq for the filters.
  const all = mockCatalogue();
  const dupes = filters.duplicatesOnly ? duplicateIds(all) : null;
  const q = filters.query?.trim().toLowerCase() ?? "";

  return all
    .filter((c) => {
      if (filters.country && c.country !== filters.country) return false;
      if (dupes && !dupes.has(c.id)) return false;
      if (!q) return true;
      return `${c.name} ${c.park} ${c.manufacturer} ${c.country} ${c.type}`
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ ...c }));
}

export async function getCoaster(id: string): Promise<Coaster | null> {
  // Step 2: supabase.from("coasters").select("*").eq("id", id).maybeSingle()
  const found = mockCatalogue().find((c) => c.id === id);
  return found ? { ...found } : null;
}

export type CatalogueSummary = {
  coasters: number;
  countries: string[];
  manufacturers: number;
  duplicates: number;
};

export async function getCatalogueSummary(): Promise<CatalogueSummary> {
  const all = mockCatalogue();
  return {
    coasters: all.length,
    countries: [...new Set(all.map((c) => c.country))].sort(),
    manufacturers: new Set(all.map((c) => c.manufacturer)).size,
    duplicates: duplicateIds(all).size,
  };
}

/**
 * Aggregate community counts for one coaster — how many members logged it and
 * how many rides in total. Counts only: who rode it and when is never exposed,
 * on this page or anywhere else.
 *
 * Step 2 makes this a `security definer` function so the aggregate crosses the
 * RLS boundary without granting row access to `ride`. Here it is derived from a
 * stable hash of the coaster id, the same way the prototype does, so the
 * numbers do not jitter between renders.
 */
export async function getCoasterCommunityCounts(
  coasterId: string,
): Promise<{ members: number; rides: number }> {
  let hash = 0;
  for (let i = 0; i < coasterId.length; i++) {
    hash = (hash * 31 + coasterId.charCodeAt(i)) % 100_000;
  }
  const members = 40 + (hash % 260);
  return { members, rides: members * 2 + (hash % 90) };
}
