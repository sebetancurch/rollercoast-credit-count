/**
 * The public leaderboard — the only data a visitor can reach.
 *
 * The two guarantees this module carries are both enforced in the database
 * rather than here (CLAUDE.md §2):
 *
 *   1. Only profiles with leaderboard_opt_in = true appear. The view's WHERE
 *      clause decides that, not this code.
 *   2. Rows carry a display name and a credit count and nothing else. The view
 *      exposes exactly two columns, so there is no id for PostgREST to filter
 *      on and nothing else for a component to leak.
 *
 * See supabase/migrations/20260813201300_public_leaderboard.sql.
 */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow } from "@/lib/types";

export async function getLeaderboard(limit = 15): Promise<LeaderboardRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_leaderboard")
    // Never select *. Naming the columns is what stops a future column on
    // profiles from being published by accident.
    .select("display_name, credit_count")
    .order("credit_count", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Postgres cannot prove a view's columns are non-null, so the generated types
  // widen them. An aggregate over a joined row never actually produces null
  // here; drop any that somehow did rather than rendering a blank rank.
  return (data ?? []).flatMap((row) =>
    row.display_name === null || row.credit_count === null
      ? []
      : [{ display_name: row.display_name, credit_count: row.credit_count }],
  );
}
