import { beforeEach, describe, expect, it } from "vitest";

import { getCatalogueSummary, listCoasters } from "@/lib/data/coasters";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { getDashboardStats, getRideCountsByCoaster, listRides } from "@/lib/data/rides";
import { MOCK_ENTHUSIAST_ID } from "@/lib/mock/fixtures";
import { hasRideHistory, nextId, setRideHistory, store } from "@/lib/mock/store";

/**
 * The data seam, against the mock store.
 *
 * These pin the behaviour the server actions rely on — in particular that
 * credits move when the ride list moves, because nothing caches them. When the
 * bodies swap to Supabase queries in step 2 these same assertions should hold
 * against the database, which is the point of testing at this boundary.
 */

const USER = MOCK_ENTHUSIAST_ID;

beforeEach(() => {
  // Each test starts from the seeded history.
  setRideHistory(USER, true);
  const s = store();
  for (const profile of Object.values(s.profiles)) profile.leaderboardOptIn = false;
});

describe("listRides", () => {
  it("returns the user's rides newest first", async () => {
    const rides = await listRides(USER);
    expect(rides).toHaveLength(62);
    expect(rides[0].ridden_on >= rides[1].ridden_on).toBe(true);
    expect(rides.at(-1)!.ridden_on).toBe("2023-05-20");
  });

  it("scopes to the user, so another id sees nothing", async () => {
    expect(await listRides("some-other-user")).toEqual([]);
  });

  it("filters on coaster, park, country and manufacturer", async () => {
    // Nemesis 7 + Wicker Man 3 + The Smiler 2 + Oblivion 2.
    expect(await listRides(USER, { query: "Alton Towers" })).toHaveLength(14);
    expect((await listRides(USER, { query: "nemesis" })).length).toBeGreaterThan(0);
    expect(await listRides(USER, { query: "zzz nothing" })).toEqual([]);
  });

  it("honours the limit the dashboard uses", async () => {
    expect(await listRides(USER, { limit: 5 })).toHaveLength(5);
  });
});

describe("deleting rides moves the derived counts", () => {
  it("drops a credit when the last ride on a coaster goes", async () => {
    const before = await getDashboardStats(USER);
    const s = store();

    // Valkyria was ridden exactly once.
    const valkyria = s.rides.filter((r) => r.coaster_id === "valkyria");
    expect(valkyria).toHaveLength(1);

    s.rides = s.rides.filter((r) => r.coaster_id !== "valkyria");

    const after = await getDashboardStats(USER);
    expect(after.credits).toBe(before.credits - 1);
    expect(after.totalRides).toBe(before.totalRides - 1);
  });

  it("keeps the credit when one of several rides goes", async () => {
    const before = await getDashboardStats(USER);
    const s = store();

    // Nemesis was ridden seven times; removing one leaves the credit alone.
    const [oneNemesisRide] = s.rides.filter((r) => r.coaster_id === "nemesis");
    s.rides = s.rides.filter((r) => r.id !== oneNemesisRide.id);

    const after = await getDashboardStats(USER);
    expect(after.credits).toBe(before.credits);
    expect(after.totalRides).toBe(before.totalRides - 1);
  });

  it("adds a credit the first time a coaster is ridden, not the second", async () => {
    const before = await getDashboardStats(USER);
    const s = store();

    // Top Thrill 2 is in the catalogue but has never been ridden.
    s.rides.push({
      id: nextId("ride"),
      user_id: USER,
      coaster_id: "topthrill2",
      ridden_on: "2026-08-01",
      note: null,
    });
    const afterFirst = await getDashboardStats(USER);
    expect(afterFirst.credits).toBe(before.credits + 1);

    s.rides.push({
      id: nextId("ride"),
      user_id: USER,
      coaster_id: "topthrill2",
      ridden_on: "2026-08-02",
      note: null,
    });
    const afterSecond = await getDashboardStats(USER);
    expect(afterSecond.credits).toBe(afterFirst.credits);
    expect(afterSecond.totalRides).toBe(afterFirst.totalRides + 1);
  });
});

describe("setRideHistory", () => {
  it("empties and restores the history", async () => {
    setRideHistory(USER, false);
    expect(hasRideHistory(USER)).toBe(false);
    expect(await listRides(USER)).toEqual([]);
    expect((await getDashboardStats(USER)).credits).toBe(0);

    setRideHistory(USER, true);
    expect(hasRideHistory(USER)).toBe(true);
    expect((await getDashboardStats(USER)).credits).toBe(36);
  });
});

describe("getRideCountsByCoaster", () => {
  it("counts rides per coaster for the log-a-ride badges", async () => {
    const counts = await getRideCountsByCoaster(USER);
    expect(counts.nemesis).toBe(7);
    expect(counts.topthrill2).toBeUndefined();
  });
});

describe("listCoasters", () => {
  it("returns the catalogue alphabetically", async () => {
    const all = await listCoasters();
    expect(all).toHaveLength(47);
    expect(all[0].name.localeCompare(all[1].name)).toBeLessThanOrEqual(0);
  });

  it("filters by country and by free text", async () => {
    expect(await listCoasters({ country: "Japan" })).toHaveLength(2);
    expect((await listCoasters({ query: "intamin" })).length).toBeGreaterThan(0);
  });

  it("can show only possible duplicates", async () => {
    const dupes = await listCoasters({ duplicatesOnly: true });
    expect(dupes.map((c) => c.id).sort()).toEqual(["icon", "iconalt"]);
  });
});

describe("getCatalogueSummary", () => {
  it("summarises the catalogue", async () => {
    const summary = await getCatalogueSummary();
    expect(summary).toMatchObject({ coasters: 47, manufacturers: 14, duplicates: 2 });
    expect(summary.countries).toHaveLength(10);
  });
});

describe("getLeaderboard", () => {
  it("omits a user who has not opted in", async () => {
    const rows = await getLeaderboard();
    expect(rows.some((r) => r.display_name === "Cass Ferreira")).toBe(false);
  });

  it("includes them once opted in, with a derived credit count", async () => {
    store().profiles[USER].leaderboardOptIn = true;

    const rows = await getLeaderboard(50);
    const mine = rows.find((r) => r.display_name === "Cass Ferreira");
    expect(mine?.credit_count).toBe(36);
  });

  it("leaves them off while they have no rides, even opted in", async () => {
    store().profiles[USER].leaderboardOptIn = true;
    setRideHistory(USER, false);

    const rows = await getLeaderboard(50);
    expect(rows.some((r) => r.display_name === "Cass Ferreira")).toBe(false);
  });

  it("exposes only display_name and credit_count", async () => {
    const rows = await getLeaderboard(1);
    // The assertion that catches a future `select *` leaking a column.
    expect(Object.keys(rows[0]).sort()).toEqual(["credit_count", "display_name"]);
  });

  it("ranks by credits descending and honours the limit", async () => {
    const rows = await getLeaderboard(5);
    expect(rows).toHaveLength(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].credit_count).toBeGreaterThanOrEqual(rows[i].credit_count);
    }
  });
});
