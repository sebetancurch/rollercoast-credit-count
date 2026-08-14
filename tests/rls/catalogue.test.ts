import { beforeAll, describe, expect, it } from "vitest";

import {
  anonClient,
  asCass,
  asPriya,
  asRowan,
  seeded,
  users,
  type TestClient,
} from "@/tests/support/clients";

describe("coaster catalogue", () => {
  let cass: TestClient;
  let rowan: TestClient;

  beforeAll(async () => {
    [cass, rowan] = await Promise.all([asCass(), asRowan()]);
  });

  it("is readable by any signed-in user", async () => {
    const { data, error } = await cass.from("coasters").select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(seeded.coasters);
  });

  it("is unreachable for a signed-out visitor", async () => {
    const { data, error } = await anonClient().from("coasters").select("*");

    // No grant at all, so this is refused rather than filtered.
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it("rejects an insert from an enthusiast", async () => {
    const { error } = await cass.from("coasters").insert({
      name: "Forged",
      park: "Somewhere",
      country: "United Kingdom",
      manufacturer: "Rocky Mountain Construction",
      type: "Hybrid",
    });

    expect(error?.code).toBe("42501");
  });

  it("leaves a coaster unchanged when an enthusiast edits it", async () => {
    const { data: before } = await cass
      .from("coasters")
      .select("id, park")
      .eq("name", "Nemesis")
      .single();

    await cass.from("coasters").update({ park: "Nowhere" }).eq("id", before!.id);

    const { data: after } = await cass
      .from("coasters")
      .select("park")
      .eq("id", before!.id)
      .single();

    expect(after?.park).toBe(before!.park);
  });

  it("leaves a coaster in place when an enthusiast deletes it", async () => {
    const { data: before } = await cass
      .from("coasters")
      .select("id")
      .eq("name", "Nemesis")
      .single();

    await cass.from("coasters").delete().eq("id", before!.id);

    const { data: after } = await cass.from("coasters").select("id").eq("id", before!.id);
    expect(after).toHaveLength(1);
  });

  it("lets an admin create, edit and remove an unused coaster", async () => {
    const { data: created, error: insertError } = await rowan
      .from("coasters")
      .insert({
        name: "Test Coaster",
        park: "Test Park",
        country: "United Kingdom",
        manufacturer: "Intamin",
        type: "Steel",
      })
      .select()
      .single();
    expect(insertError).toBeNull();

    const { error: updateError } = await rowan
      .from("coasters")
      .update({ park: "Renamed Park" })
      .eq("id", created!.id);
    expect(updateError).toBeNull();

    const { data: edited } = await rowan
      .from("coasters")
      .select("park")
      .eq("id", created!.id)
      .single();
    expect(edited?.park).toBe("Renamed Park");

    const { error: deleteError } = await rowan
      .from("coasters")
      .delete()
      .eq("id", created!.id);
    expect(deleteError).toBeNull();
  });

  it("refuses to remove a coaster that has rides against it", async () => {
    const { data: nemesis } = await rowan
      .from("coasters")
      .select("id")
      .eq("name", "Nemesis")
      .single();

    const { error } = await rowan.from("coasters").delete().eq("id", nemesis!.id);

    // on delete restrict. A cascade here would silently rewrite other people's
    // credit counts; this is the error the admin dialog surfaces instead.
    expect(error?.code).toBe("23503");
  });

  it("keeps the seeded duplicate pair the admin filter exists to surface", async () => {
    const { data } = await cass.from("coasters").select("name, park").ilike("name", "icon");

    expect(data).toHaveLength(2);
    expect(new Set(data!.map((c) => c.park))).toEqual(new Set(["Blackpool Pleasure Beach"]));
  });

  it("exposes community counts as counts only", async () => {
    const { data: nemesis } = await cass
      .from("coasters")
      .select("id")
      .eq("name", "Nemesis")
      .single();

    const { data, error } = await cass.rpc("coaster_community_counts", {
      p_coaster_id: nemesis!.id,
    });

    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    // Two integers and nothing else — no user id, no date, no note.
    expect(Object.keys(row as object).sort()).toEqual(["members", "rides"]);
    expect((row as { rides: number }).rides).toBeGreaterThan(0);
  });

  it("does not let a signed-out visitor call the community aggregate", async () => {
    const { error } = await anonClient().rpc("coaster_community_counts", {
      p_coaster_id: "00000000-0000-4000-8000-000000000000",
    });

    expect(error).toBeTruthy();
  });
});

describe("privilege escalation", () => {
  it("refuses to let an enthusiast promote themselves to admin", async () => {
    const priya = await asPriya();

    const { error } = await priya
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", users.priya.id);

    // Column privilege, not RLS: `authenticated` holds UPDATE on username and
    // leaderboard_opt_in and on nothing else.
    expect(error).toBeTruthy();

    const { data: after } = await priya
      .from("profiles")
      .select("role")
      .eq("id", users.priya.id)
      .single();
    expect(after?.role).toBe("enthusiast");
  });

  it("still refuses when the role change rides along with a legitimate one", async () => {
    const priya = await asPriya();

    const { error } = await priya
      .from("profiles")
      .update({ username: users.priya.username, role: "admin" })
      .eq("id", users.priya.id);

    expect(error).toBeTruthy();

    const { data: after } = await priya
      .from("profiles")
      .select("role, username")
      .eq("id", users.priya.id)
      .single();
    expect(after?.role).toBe("enthusiast");
    expect(after?.username).toBe(users.priya.username);
  });
});
