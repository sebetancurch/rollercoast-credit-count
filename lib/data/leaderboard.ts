/**
 * The public leaderboard — the only data a visitor can reach.
 *
 * Two guarantees this module exists to hold, both from CLAUDE.md §2:
 *
 *   1. Only profiles with leaderboard_opt_in = true appear.
 *   2. Rows carry a display name and a credit count and nothing else — no user
 *      id, no coasters, no dates. The table component cannot leak a field it is
 *      never handed, and PostgREST cannot filter on a column the view does not
 *      expose.
 *
 * In step 2 the body becomes a select against the `public_leaderboard` view,
 * which aggregates behind the RLS boundary so `anon` sees counts without
 * gaining row access to `ride`.
 */

import "server-only";

import { isMockMode } from "@/lib/env";
import { MOCK_LEADERBOARD } from "@/lib/mock/fixtures";
import { store } from "@/lib/mock/store";
import { creditCount } from "@/lib/stats";
import type { LeaderboardRow } from "@/lib/types";

export async function getLeaderboard(limit = 15): Promise<LeaderboardRow[]> {
  if (!isMockMode) {
    // Step 2:
    // const supabase = await createClient();
    // const { data, error } = await supabase
    //   .from("public_leaderboard")
    //   .select("display_name, credit_count")   // never select *
    //   .order("credit_count", { ascending: false })
    //   .limit(limit);
    // if (error) throw error;
    // return data ?? [];
    throw new Error("The public_leaderboard view does not exist yet (step 2).");
  }

  const s = store();
  const rows: LeaderboardRow[] = MOCK_LEADERBOARD.map((r) => ({ ...r }));

  // The mock users join the board only when opted in and only with a credit
  // count derived from their rides — never a stored total.
  for (const profile of Object.values(s.profiles)) {
    if (!profile.leaderboardOptIn) continue;

    const byId = new Map(s.coasters.map((c) => [c.id, c]));
    const rides = s.rides
      .filter((r) => r.user_id === profile.id)
      .flatMap((r) => {
        const coaster = byId.get(r.coaster_id);
        return coaster ? [{ ...r, coaster }] : [];
      });

    const credits = creditCount(rides);
    if (credits > 0) {
      rows.push({ display_name: profile.displayName, credit_count: credits });
    }
  }

  return rows.sort((a, b) => b.credit_count - a.credit_count).slice(0, limit);
}
