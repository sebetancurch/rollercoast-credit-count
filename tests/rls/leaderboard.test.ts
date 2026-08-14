import { afterAll, describe, expect, it } from "vitest";

import { anonClient, asCass, seeded, users } from "@/tests/support/clients";

/**
 * The public leaderboard is the one thing a signed-out visitor can reach, so
 * what it publishes is the whole of what the product exposes about anyone.
 */
describe("public leaderboard", () => {
  afterAll(async () => {
    // The opt-in test below flips a real row; put it back so a re-run of the
    // suite without a db reset still starts from the seeded state.
    const cass = await asCass();
    await cass
      .from("profiles")
      .update({ leaderboard_opt_in: false })
      .eq("id", users.cass.id);
  });

  it("is readable without signing in", async () => {
    const { data, error } = await anonClient().from("public_leaderboard").select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(seeded.boardMembers);
  });

  it("exposes exactly display_name and credit_count", async () => {
    const { data } = await anonClient().from("public_leaderboard").select("*").limit(1);

    // The assertion that catches a future `select *` leaking a column.
    expect(Object.keys(data![0]).sort()).toEqual(["credit_count", "display_name"]);
  });

  it("cannot be filtered by a user id, because it exposes none", async () => {
    const query = anonClient().from("public_leaderboard").select("*");

    // PostgREST can filter on any exposed column, so an id here would turn the
    // board into a per-user lookup. There is no such column — the generated
    // types reject the name at compile time, and PostgREST rejects it at
    // runtime. Both are asserted: the directive below fails the build if the
    // column ever appears.
    // @ts-expect-error "user_id" is not a column on public_leaderboard
    const { error } = await query.eq("user_id", users.cass.id);

    expect(error).toBeTruthy();
  });

  it("omits a member who has not opted in", async () => {
    const { data } = await anonClient()
      .from("public_leaderboard")
      .select("display_name")
      .eq("display_name", users.cass.username);

    expect(data).toEqual([]);
  });

  it("ranks by credit count", async () => {
    const { data } = await anonClient()
      .from("public_leaderboard")
      .select("credit_count")
      .order("credit_count", { ascending: false });

    // The view's columns type as nullable because Postgres cannot prove an
    // aggregate is non-null; in practice every row has a count.
    const counts = data!.map((r) => r.credit_count ?? 0);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("adds a member the moment they opt in, with a derived count", async () => {
    const cass = await asCass();

    const { error } = await cass
      .from("profiles")
      .update({ leaderboard_opt_in: true })
      .eq("id", users.cass.id);
    expect(error).toBeNull();

    const { data } = await anonClient()
      .from("public_leaderboard")
      .select("display_name, credit_count")
      .eq("display_name", users.cass.username);

    expect(data).toHaveLength(1);
    // Counted from her rides at read time — there is no stored total anywhere.
    expect(data![0].credit_count).toBe(seeded.cassCredits);
  });

  it("removes them again when they opt out", async () => {
    const cass = await asCass();

    await cass.from("profiles").update({ leaderboard_opt_in: false }).eq("id", users.cass.id);

    const { data } = await anonClient()
      .from("public_leaderboard")
      .select("display_name")
      .eq("display_name", users.cass.username);

    expect(data).toEqual([]);
  });
});
