import { describe, expect, it } from "vitest";

import { MOCK_COASTERS, MOCK_RIDES } from "@/lib/mock/fixtures";
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

const byId = new Map(MOCK_COASTERS.map((c) => [c.id, c]));

/** The seeded history, joined the way lib/data/rides.ts joins it. */
const seeded: RideWithCoaster[] = MOCK_RIDES.map((r) => ({
  ...r,
  coaster: byId.get(r.coaster_id)!,
}));

function coaster(over: Partial<Coaster> = {}): Coaster {
  return {
    id: "c1",
    name: "Test Coaster",
    park: "Test Park",
    country: "United Kingdom",
    manufacturer: "Intamin",
    type: "Steel",
    ...over,
  };
}

function ride(coasterOver: Partial<Coaster>, riddenOn: string, id = riddenOn): RideWithCoaster {
  const c = coaster(coasterOver);
  return {
    id,
    user_id: "u1",
    coaster_id: c.id,
    ridden_on: riddenOn,
    note: null,
    coaster: c,
  };
}

describe("credits versus rides", () => {
  it("counts one credit per distinct coaster, however many times it was ridden", () => {
    const rides = [
      ride({ id: "a" }, "2026-01-01"),
      ride({ id: "a" }, "2026-01-02"),
      ride({ id: "a" }, "2026-01-03"),
      ride({ id: "b" }, "2026-01-04"),
    ];

    expect(creditCount(rides)).toBe(2);
    expect(rideCount(rides)).toBe(4);
  });

  it("does not increment credits when a coaster is ridden again", () => {
    const first = [ride({ id: "a" }, "2026-01-01")];
    const again = [...first, ride({ id: "a" }, "2026-01-02", "second")];

    expect(creditCount(first)).toBe(1);
    expect(creditCount(again)).toBe(1);
    expect(rideCount(again)).toBe(2);
  });

  it("has no credits and no rides for an empty history", () => {
    expect(creditCount([])).toBe(0);
    expect(rideCount([])).toBe(0);
    expect(computeDashboardStats([]).mostRidden).toBeNull();
  });

  it("derives the seeded fixture's headline numbers", () => {
    // The gap between these two is the whole product. If a future seed makes
    // them equal, the dashboard stops demonstrating anything.
    expect(creditCount(seeded)).toBe(36);
    expect(rideCount(seeded)).toBe(62);
    expect(creditCount(seeded)).toBeLessThan(rideCount(seeded));
  });
});

describe("ridesPerCoaster", () => {
  it("counts rides against each coaster id", () => {
    const counts = ridesPerCoaster(seeded);
    expect(counts.get("nemesis")).toBe(7);
    expect(counts.get("valkyria")).toBe(1);
    expect(counts.has("topthrill2")).toBe(false); // in the catalogue, never ridden
  });
});

describe("mostRiddenCoaster", () => {
  it("picks the coaster with the most rides", () => {
    const top = mostRiddenCoaster(seeded);
    expect(top?.coaster.name).toBe("Nemesis");
    expect(top?.rides).toBe(7);
  });

  it("breaks ties by name so the answer is deterministic", () => {
    const rides = [
      ride({ id: "z", name: "Zephyr" }, "2026-01-01"),
      ride({ id: "z", name: "Zephyr" }, "2026-01-02", "z2"),
      ride({ id: "a", name: "Apex" }, "2026-01-03"),
      ride({ id: "a", name: "Apex" }, "2026-01-04", "a2"),
    ];
    expect(mostRiddenCoaster(rides)?.coaster.name).toBe("Apex");
  });
});

describe("groupCreditsBy", () => {
  it("groups credits, not rides", () => {
    const rides = [
      ride({ id: "a", country: "Germany" }, "2026-01-01"),
      ride({ id: "a", country: "Germany" }, "2026-01-02", "a2"),
      ride({ id: "b", country: "Spain" }, "2026-01-03"),
    ];
    // Germany has two rides but only one credit.
    expect(groupCreditsBy(rides, "country")).toEqual([
      { label: "Germany", n: 1, pct: 100 },
      { label: "Spain", n: 1, pct: 100 },
    ]);
  });

  it("orders by count descending, then alphabetically", () => {
    const rows = groupCreditsBy(seeded, "country");
    expect(rows.map((r) => r.label)).toEqual([
      "United Kingdom",
      "United States",
      "Germany",
      "Netherlands",
      "Spain",
      "Sweden",
      "France",
      "Denmark",
    ]);
    expect(rows[0]).toEqual({ label: "United Kingdom", n: 11, pct: 100 });
  });

  it("scales percentages against the largest group", () => {
    expect(groupCreditsBy(seeded, "type")).toEqual([
      { label: "Steel", n: 26, pct: 100 },
      { label: "Wooden", n: 7, pct: 27 },
      { label: "Hybrid", n: 3, pct: 12 },
    ]);
  });

  it("returns nothing for an empty history", () => {
    expect(groupCreditsBy([], "manufacturer")).toEqual([]);
  });
});

describe("computeDashboardStats", () => {
  const stats = computeDashboardStats(seeded);

  it("reports repeat coasters", () => {
    expect(stats.repeatCoasters).toBe(15);
  });

  it("keys country counts by name for the choropleth", () => {
    expect(stats.countryCounts["United Kingdom"]).toBe(11);
    expect(stats.countryCounts["Denmark"]).toBe(1);
    expect(stats.countryCounts["Japan"]).toBeUndefined();
  });

  it("agrees with the standalone helpers", () => {
    expect(stats.credits).toBe(creditCount(seeded));
    expect(stats.totalRides).toBe(rideCount(seeded));
    expect(stats.byCountry).toEqual(groupCreditsBy(seeded, "country"));
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
    const ids = duplicateIds(MOCK_COASTERS);
    // "Icon" and "ICON" at Blackpool Pleasure Beach are the seeded pair an
    // admin is meant to find and merge.
    expect(ids.has("icon")).toBe(true);
    expect(ids.has("iconalt")).toBe(true);
    expect(ids.size).toBe(2);
  });

  it("does not flag a coaster with the same name at a different park", () => {
    const ids = duplicateIds([
      coaster({ id: "1", name: "Colossus", park: "Thorpe Park" }),
      coaster({ id: "2", name: "Colossus", park: "Heide Park" }),
    ]);
    expect(ids.size).toBe(0);
  });
});
