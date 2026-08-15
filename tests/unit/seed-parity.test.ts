import { describe, expect, it } from "vitest";

// A plain ESM script with no types, shared with scripts/seed-remote.mjs so the
// hosted seeder and this test read the seed through exactly one parser.
import { readSeed } from "@/scripts/seed-fixtures.mjs";

import { seeded, users } from "@/tests/support/clients";

/**
 * scripts/seed-fixtures.mjs parses supabase/seed.sql so the hosted seeding
 * script and the local one cannot disagree. That parse is regex-shaped, which
 * means a harmless reformat of seed.sql could quietly make it read half the
 * file — and the only environment that would notice is the hosted one, which
 * nothing tests.
 *
 * So this asserts the parse against the numbers seed.sql asserts about itself.
 * No database, no network: it is the seed as text, checked arithmetically.
 */
describe("seed fixtures parse of supabase/seed.sql", () => {
  const seed = readSeed() as {
    people: {
      id: string;
      email: string;
      displayName: string;
      role: string;
      leaderboardOptIn: boolean;
    }[];
    coasters: { ord: number; slug: string; name: string; id: string }[];
    rides: { userId: string; coasterId: string; riddenOn: string; note: string | null }[];
  };

  const ridesOf = (userId: string) => seed.rides.filter((r) => r.userId === userId);
  const creditsOf = (userId: string) =>
    new Set(ridesOf(userId).map((r) => r.coasterId)).size;

  it("reads the whole catalogue, with derived ids", () => {
    expect(seed.coasters).toHaveLength(seeded.coasters);
    expect(seed.coasters[0]).toMatchObject({ ord: 1, slug: "nemesis", name: "Nemesis" });
    expect(seed.coasters[0].id).toBe("c0a57e00-0000-4000-8000-000000000001");

    // 'Canada''s Wonderland' is the row that breaks a naive quote parser.
    expect(seed.coasters.map((c) => c.name)).toContain("Leviathan");
  });

  it("reads every person, and only people", () => {
    // The pg_temp.seed_user *definition* sits above the calls and must not be
    // read as one of them.
    expect(seed.people.every((p) => p.email.includes("@"))).toBe(true);
    expect(seed.people.filter((p) => p.role === "admin")).toHaveLength(1);
    expect(seed.people.find((p) => p.id === users.rowan.id)?.role).toBe("admin");
  });

  it("agrees with seed.sql's own assertion about Cass", () => {
    expect(ridesOf(users.cass.id)).toHaveLength(seeded.cassRides);
    expect(creditsOf(users.cass.id)).toBe(seeded.cassCredits);
    // The property the whole product rests on.
    expect(creditsOf(users.cass.id)).toBeLessThan(ridesOf(users.cass.id).length);
  });

  it("agrees about Leon, whose rides seed.sql generates rather than lists", () => {
    expect(ridesOf(users.leon.id)).toHaveLength(seeded.leonRides);
    expect(creditsOf(users.leon.id)).toBe(seeded.leonCredits);
  });

  it("gives brand_new_bea no rides at all", () => {
    expect(ridesOf(users.bea.id)).toHaveLength(0);
    expect(seed.people.find((p) => p.id === users.bea.id)?.leaderboardOptIn).toBe(true);
  });

  it("produces a board that overflows the page's limit of 15", () => {
    const onBoard = seed.people.filter(
      (p) => p.role === "enthusiast" && p.leaderboardOptIn && ridesOf(p.id).length > 0,
    );

    expect(onBoard).toHaveLength(seeded.boardMembers);
    expect(onBoard.length).toBeGreaterThan(15);
  });

  it("keeps every ride pointing at a coaster in the catalogue", () => {
    const known = new Set(seed.coasters.map((c) => c.id));
    expect(seed.rides.filter((r) => !known.has(r.coasterId))).toEqual([]);
  });

  it("keeps the top of the board stable", () => {
    // The walkthrough asserts woodie_wendy at rank 1 with 30. Nothing added to
    // the seed may outrank her, or that check silently stops meaning anything.
    const counts = seed.people
      .filter((p) => p.leaderboardOptIn && p.role === "enthusiast")
      .map((p) => creditsOf(p.id))
      .sort((a, b) => b - a);

    expect(counts[0]).toBe(30);
    expect(counts[1]).toBeLessThan(30);
  });
});
