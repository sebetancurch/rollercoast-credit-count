import { beforeAll, describe, expect, it } from "vitest";

import { RIDE_SELECT } from "@/lib/data/selects";
import type { RideWithCoaster } from "@/lib/types";
import {
  anonClient,
  asCass,
  asPriya,
  asRowan,
  seeded,
  users,
  type TestClient,
} from "@/tests/support/clients";

/**
 * Ride isolation, through PostgREST with real JWTs.
 *
 * The pgTAP suite proves the policies at the SQL level; this proves the same
 * thing over HTTP, which is what the application actually speaks — it would
 * also catch a table wrongly exposed through the API schema, or a grant that
 * lets a request through before a policy is ever consulted.
 *
 * RLS failures do not all look alike, and the assertions differ accordingly:
 *   SELECT blocked by policy  → data: [], error: null   (rows filtered, not refused)
 *   INSERT violating a check  → error.code 42501
 *   UPDATE/DELETE matching no row → no error, zero rows; proven by re-reading as owner
 */
describe("ride isolation", () => {
  let cass: TestClient;
  let priya: TestClient;
  let rowan: TestClient;

  beforeAll(async () => {
    [cass, priya, rowan] = await Promise.all([asCass(), asPriya(), asRowan()]);
  });

  it("lets an owner read exactly their own rides", async () => {
    const { data, error } = await cass.from("ride").select("id, coaster_id");

    expect(error).toBeNull();
    expect(data).toHaveLength(seeded.cassRides);
    expect(new Set(data!.map((r) => r.coaster_id)).size).toBe(seeded.cassCredits);
  });

  it("returns no rows when one enthusiast selects another's rides", async () => {
    const { data, error } = await priya
      .from("ride")
      .select("*")
      .eq("user_id", users.cass.id);

    // Filtered out, not rejected. Asserting an error here would fail against a
    // perfectly secure database.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns nothing at all to an admin", async () => {
    const { data, error } = await rowan.from("ride").select("*");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("rejects an insert attributed to another user", async () => {
    const { data: coaster } = await priya.from("coasters").select("id").limit(1).single();

    const { error } = await priya.from("ride").insert({
      user_id: users.cass.id,
      coaster_id: coaster!.id,
      ridden_on: "2026-01-01",
    });

    expect(error?.code).toBe("42501");
  });

  it("leaves the row untouched when one enthusiast updates another's ride", async () => {
    const { data: target } = await cass
      .from("ride")
      .select("id, note")
      .not("note", "is", null)
      .limit(1)
      .single();

    await priya.from("ride").update({ note: "hijacked" }).eq("id", target!.id);

    // Zero rows affected is silent. The proof is what the owner still sees.
    const { data: after } = await cass
      .from("ride")
      .select("note")
      .eq("id", target!.id)
      .single();

    expect(after?.note).toBe(target!.note);
  });

  it("leaves the row in place when one enthusiast deletes another's ride", async () => {
    const { data: target } = await cass.from("ride").select("id").limit(1).single();

    await priya.from("ride").delete().eq("id", target!.id);

    const { data: after, error } = await cass
      .from("ride")
      .select("id")
      .eq("id", target!.id)
      .single();

    expect(error).toBeNull();
    expect(after?.id).toBe(target!.id);
  });

  it("refuses to let an owner reassign their own ride to someone else", async () => {
    const { data: target } = await cass.from("ride").select("id").limit(1).single();

    const { error } = await cass
      .from("ride")
      .update({ user_id: users.priya.id })
      .eq("id", target!.id);

    // The `with check` half of the update policy.
    expect(error?.code).toBe("42501");
  });

  it("gives a signed-out visitor no access", async () => {
    const { data, error } = await anonClient().from("ride").select("*");

    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it("round-trips an owner's own ride through insert, update and delete", async () => {
    const { data: coaster } = await cass
      .from("coasters")
      .select("id")
      .eq("name", "Top Thrill 2")
      .single();

    const { data: created, error: insertError } = await cass
      .from("ride")
      .insert({ user_id: users.cass.id, coaster_id: coaster!.id, ridden_on: "2026-08-01" })
      .select()
      .single();
    expect(insertError).toBeNull();

    const { error: updateError } = await cass
      .from("ride")
      .update({ note: "back row" })
      .eq("id", created!.id);
    expect(updateError).toBeNull();

    const { error: deleteError } = await cass.from("ride").delete().eq("id", created!.id);
    expect(deleteError).toBeNull();

    const { data: gone } = await cass.from("ride").select("id").eq("id", created!.id);
    expect(gone).toEqual([]);
  });

  it("returns the coaster embed in the shape the ride views expect", async () => {
    // lib/data/rides.ts casts this response to RideWithCoaster, which the type
    // checker cannot verify. If PostgREST ever returned the embed as an array —
    // it does for a to-many relationship — every ride row would render blank
    // and nothing else would catch it.
    const { data, error } = await cass.from("ride").select(RIDE_SELECT).limit(1);

    expect(error).toBeNull();
    const row = data![0] as unknown as RideWithCoaster;

    expect(Object.keys(row).sort()).toEqual([
      "coaster",
      "coaster_id",
      "created_at",
      "id",
      "note",
      "ridden_on",
      "user_id",
    ]);
    expect(Array.isArray(row.coaster)).toBe(false);
    expect(Object.keys(row.coaster).sort()).toEqual([
      "country",
      "id",
      "manufacturer",
      "name",
      "park",
      "type",
    ]);
    expect(row.coaster.id).toBe(row.coaster_id);
  });

  it("rejects a ride dated in the future", async () => {
    const { data: coaster } = await cass.from("coasters").select("id").limit(1).single();

    const { error } = await cass.from("ride").insert({
      user_id: users.cass.id,
      coaster_id: coaster!.id,
      ridden_on: "2099-01-01",
    });

    expect(error?.code).toBe("23514"); // check_violation
  });
});
