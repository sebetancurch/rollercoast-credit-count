import { describe, expect, it } from "vitest";

import {
  choroplethColor,
  computeDashboardStats,
  creditCount,
  duplicateIds,
  groupCreditsBy,
  mostRiddenCoaster,
  rideCount,
  ridesPerCoaster,
} from "@/lib/stats";
import type { Coaster, RideWithCoaster } from "@/lib/types";

/**
 * Pure unit tests for the derived statistics.
 *
 * The fixture is local and deliberately small: these functions are arithmetic
 * over a ride list and nothing here should depend on the seed. That the *seed*
 * produces 36 credits from 62 rides is asserted where the seed lives —
 * supabase/seed.sql and tests/rls/ — because that is a property of the data,
 * not of this code.
 *
 * CLAUDE.md §3: credits are count(distinct coaster_id), computed at read time,
 * never stored. Every assertion below exists to keep that true.
 */

const COASTERS: Record<string, Coaster> = {
  nemesis:  c("nemesis",  "Nemesis",  "Alton Towers",   "United Kingdom", "Bolliger & Mabillard",         "Steel"),
  oblivion: c("oblivion", "Oblivion", "Alton Towers",   "United Kingdom", "Bolliger & Mabillard",         "Steel"),
  taron:    c("taron",    "Taron",    "Phantasialand",  "Germany",        "Intamin",                      "Steel"),
  wodan:    c("wodan",    "Wodan",    "Europa-Park",    "Germany",        "Great Coasters International", "Wooden"),
  untamed:  c("untamed",  "Untamed",  "Walibi Holland", "Netherlands",    "Rocky Mountain Construction",  "Hybrid"),
  balder:   c("balder",   "Balder",   "Liseberg",       "Sweden",         "Intamin",                      "Wooden"),
};

function c(
  id: string,
  name: string,
  park: string,
  country: string,
  manufacturer: string,
  type: Coaster["type"],
): Coaster {
  return { id, name, park, country, manufacturer, type };
}

function ride(coasterId: keyof typeof COASTERS, riddenOn: string): RideWithCoaster {
  return {
    id: `${coasterId}-${riddenOn}`,
    user_id: "u1",
    coaster_id: coasterId,
    ridden_on: riddenOn,
    note: null,
    coaster: COASTERS[coasterId],
  };
}

/** 9 rides across 6 distinct coasters; Nemesis ×3 and Taron ×2 are the repeats. */
const HISTORY: RideWithCoaster[] = [
  ride("nemesis", "2026-01-01"),
  ride("nemesis", "2026-02-01"),
  ride("nemesis", "2026-03-01"),
  ride("oblivion", "2026-01-01"),
  ride("taron", "2026-04-01"),
  ride("taron", "2026-04-02"),
  ride("wodan", "2026-04-03"),
  ride("untamed", "2026-05-01"),
  ride("balder", "2026-06-01"),
];

describe("credits versus rides", () => {
  it("counts one credit per distinct coaster, however many times it was ridden", () => {
    expect(creditCount(HISTORY)).toBe(6);
    expect(rideCount(HISTORY)).toBe(9);
  });

  it("does not increment credits when a coaster is ridden again", () => {
    const first = [ride("nemesis", "2026-01-01")];
    const again = [...first, ride("nemesis", "2026-02-01")];

    expect(creditCount(first)).toBe(1);
    expect(creditCount(again)).toBe(1);
    expect(rideCount(again)).toBe(2);
  });

  it("loses the credit when the only ride on a coaster goes", () => {
    const withBalder = creditCount(HISTORY);
    const without = creditCount(HISTORY.filter((r) => r.coaster_id !== "balder"));
    expect(without).toBe(withBalder - 1);
  });

  it("keeps the credit when one of several rides goes", () => {
    const dropped = HISTORY.filter((r) => r.id !== "nemesis-2026-01-01");
    expect(creditCount(dropped)).toBe(creditCount(HISTORY));
    expect(rideCount(dropped)).toBe(rideCount(HISTORY) - 1);
  });

  it("has no credits and no rides for an empty history", () => {
    expect(creditCount([])).toBe(0);
    expect(rideCount([])).toBe(0);
    expect(computeDashboardStats([]).mostRidden).toBeNull();
  });
});

describe("ridesPerCoaster", () => {
  it("counts rides against each coaster id", () => {
    const counts = ridesPerCoaster(HISTORY);
    expect(counts.get("nemesis")).toBe(3);
    expect(counts.get("balder")).toBe(1);
    expect(counts.has("never-ridden")).toBe(false);
  });
});

describe("mostRiddenCoaster", () => {
  it("picks the coaster with the most rides", () => {
    const top = mostRiddenCoaster(HISTORY);
    expect(top?.coaster.name).toBe("Nemesis");
    expect(top?.rides).toBe(3);
  });

  it("breaks ties by name so the answer is deterministic", () => {
    const tied = [
      ride("taron", "2026-04-01"),
      ride("taron", "2026-04-02"),
      ride("balder", "2026-06-01"),
      ride("balder", "2026-06-02"),
    ];
    expect(mostRiddenCoaster(tied)?.coaster.name).toBe("Balder");
  });
});

describe("groupCreditsBy", () => {
  it("groups credits, not rides", () => {
    // Germany has three rides (Taron ×2, Wodan) but only two credits.
    expect(groupCreditsBy(HISTORY, "country")).toEqual([
      { label: "Germany", n: 2, pct: 100 },
      { label: "United Kingdom", n: 2, pct: 100 },
      { label: "Netherlands", n: 1, pct: 50 },
      { label: "Sweden", n: 1, pct: 50 },
    ]);
  });

  it("orders by count descending, then alphabetically", () => {
    expect(groupCreditsBy(HISTORY, "manufacturer").map((r) => r.label)).toEqual([
      "Bolliger & Mabillard",
      "Intamin",
      "Great Coasters International",
      "Rocky Mountain Construction",
    ]);
  });

  it("scales percentages against the largest group", () => {
    expect(groupCreditsBy(HISTORY, "type")).toEqual([
      { label: "Steel", n: 3, pct: 100 },
      { label: "Wooden", n: 2, pct: 67 },
      { label: "Hybrid", n: 1, pct: 33 },
    ]);
  });

  it("returns nothing for an empty history", () => {
    expect(groupCreditsBy([], "manufacturer")).toEqual([]);
  });
});

describe("computeDashboardStats", () => {
  const stats = computeDashboardStats(HISTORY);

  it("reports repeat coasters", () => {
    expect(stats.repeatCoasters).toBe(2); // Nemesis and Taron
  });

  it("keys country counts by name for the choropleth", () => {
    expect(stats.countryCounts).toEqual({
      Germany: 2,
      "United Kingdom": 2,
      Netherlands: 1,
      Sweden: 1,
    });
  });

  it("agrees with the standalone helpers", () => {
    expect(stats.credits).toBe(creditCount(HISTORY));
    expect(stats.totalRides).toBe(rideCount(HISTORY));
    expect(stats.byCountry).toEqual(groupCreditsBy(HISTORY, "country"));
  });
});

describe("choroplethColor", () => {
  it("returns the empty shade for no credits", () => {
    expect(choroplethColor(0, 10)).toBe("#dedbdb");
  });

  it("buckets into four steps of the accent ramp", () => {
    expect(choroplethColor(1, 8)).toBe("#cbeeff");
    expect(choroplethColor(4, 8)).toBe("#99e0ff");
    expect(choroplethColor(6, 8)).toBe("#38a6cf");
    expect(choroplethColor(8, 8)).toBe("#006786");
  });

  it("uses the darkest step when the maximum is one", () => {
    expect(choroplethColor(1, 1)).toBe("#006786");
  });
});

describe("duplicateIds", () => {
  it("matches on name and park, ignoring case and punctuation", () => {
    // The pair supabase/seed.sql keeps so the admin filter has something to find.
    const ids = duplicateIds([
      c("icon", "Icon", "Blackpool Pleasure Beach", "United Kingdom", "Mack Rides", "Steel"),
      c("iconalt", "ICON", "Blackpool Pleasure Beach", "United Kingdom", "Mack Rides", "Steel"),
      COASTERS.nemesis,
    ]);

    expect(ids).toEqual(new Set(["icon", "iconalt"]));
  });

  it("does not flag a coaster with the same name at a different park", () => {
    const ids = duplicateIds([
      c("1", "Colossus", "Thorpe Park", "United Kingdom", "Intamin", "Steel"),
      c("2", "Colossus", "Heide Park", "Germany", "Intamin", "Wooden"),
    ]);
    expect(ids.size).toBe(0);
  });
});
