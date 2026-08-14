/**
 * Coaster catalogue reads.
 *
 * The catalogue is the one table every signed-in user may read in full — credit
 * counts are only comparable because everyone counts against the same list.
 * A signed-out visitor has no grant on it at all.
 */

import "server-only";

import { COASTER_SELECT } from "@/lib/data/selects";
import { createClient } from "@/lib/supabase/server";
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

/**
 * PostgREST's `or` filter is a small expression language: commas separate
 * terms, parentheses group them, dots separate operator from value. A raw
 * search string containing any of those would change the shape of the filter
 * rather than be matched by it. The catalogue is searched by name, so dropping
 * that punctuation costs nothing and closes the hole.
 */
function sanitiseSearch(raw: string): string {
  return raw.trim().replace(/[,().:"*\\%]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listCoasters(filters: CoasterFilters = {}): Promise<Coaster[]> {
  const supabase = await createClient();

  let query = supabase
    .from("coasters")
    .select(COASTER_SELECT)
    .order("name");

  if (filters.country) query = query.eq("country", filters.country);

  const search = sanitiseSearch(filters.query ?? "");
  if (search) {
    query = query.or(
      ["name", "park", "manufacturer", "country"]
        .map((column) => `${column}.ilike.%${search}%`)
        .join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  if (!filters.duplicatesOnly) return rows;

  // Duplicate detection compares every row against every other, so it needs the
  // whole set rather than the filtered slice.
  const { data: all, error: allError } = await supabase
    .from("coasters")
    .select(COASTER_SELECT);
  if (allError) throw allError;

  const dupes = duplicateIds(all ?? []);
  return rows.filter((c) => dupes.has(c.id));
}

export async function getCoaster(id: string): Promise<Coaster | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coasters")
    .select(COASTER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type CatalogueSummary = {
  coasters: number;
  countries: string[];
  manufacturers: number;
  duplicates: number;
};

export async function getCatalogueSummary(): Promise<CatalogueSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coasters")
    .select(COASTER_SELECT);
  if (error) throw error;

  const all = data ?? [];
  return {
    coasters: all.length,
    countries: [...new Set(all.map((c) => c.country))].sort(),
    manufacturers: new Set(all.map((c) => c.manufacturer)).size,
    duplicates: duplicateIds(all).size,
  };
}

/**
 * Aggregate community totals for one coaster.
 *
 * A plain select could not compute this: RLS scopes `ride` to its owner, so no
 * caller can see anyone else's rows. The RPC is `security definer` and returns
 * two integers — counts only. Who rode it, and when, is never exposed.
 */
export async function getCoasterCommunityCounts(
  coasterId: string,
): Promise<{ members: number; rides: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("coaster_community_counts", {
    p_coaster_id: coasterId,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return { members: row?.members ?? 0, rides: row?.rides ?? 0 };
}
