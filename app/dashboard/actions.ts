"use server";

import { revalidatePath } from "next/cache";

import { requireEnthusiast } from "@/lib/auth/session";
import { isMockMode } from "@/lib/env";
import { nextId, store } from "@/lib/mock/store";
import { fieldErrors, logRideSchema, updateRideSchema } from "@/lib/validation";

/**
 * Ride mutations.
 *
 * Three rules every action here follows, because a server action is a public
 * HTTP endpoint:
 *
 *   1. The session is re-read inside the action. Being rendered behind a guard
 *      proves nothing about who is calling it.
 *   2. The payload is parsed before it is used.
 *   3. user_id comes from the verified session and never from the arguments —
 *      no action accepts a parameter that says who is acting.
 *
 * Ownership is checked here *and* will be checked by RLS. The check here gives
 * a decent error; the one in the database is the one that counts.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

function assertMock() {
  if (!isMockMode) {
    throw new Error("Supabase writes are not wired up yet. Leave USE_MOCK_DATA=true.");
  }
}

function revalidateRideViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rides");
  revalidatePath("/"); // the leaderboard reads this user's derived credit count
}

export async function logRide(input: unknown): Promise<ActionResult> {
  const user = await requireEnthusiast();

  const parsed = logRideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: Object.values(fieldErrors(parsed.error))[0] };
  }

  assertMock();
  const s = store();
  if (!s.coasters.some((c) => c.id === parsed.data.coasterId)) {
    return { ok: false, error: "That coaster is no longer in the catalogue." };
  }

  // Step 2: supabase.from("ride").insert({ ...parsed.data, user_id: user.id })
  s.rides.push({
    id: nextId("ride"),
    user_id: user.id,
    coaster_id: parsed.data.coasterId,
    ridden_on: parsed.data.riddenOn,
    note: parsed.data.note,
  });

  revalidateRideViews();
  return { ok: true };
}

export async function updateRide(input: unknown): Promise<ActionResult> {
  const user = await requireEnthusiast();

  const parsed = updateRideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: Object.values(fieldErrors(parsed.error))[0] };
  }

  assertMock();
  const s = store();
  // Scoped by user_id as well as id: a ride belonging to someone else must not
  // be findable, let alone editable.
  const ride = s.rides.find((r) => r.id === parsed.data.rideId && r.user_id === user.id);
  if (!ride) return { ok: false, error: "That ride could not be found." };

  ride.ridden_on = parsed.data.riddenOn;
  ride.note = parsed.data.note;

  revalidateRideViews();
  return { ok: true };
}

export async function deleteRide(rideId: string): Promise<ActionResult> {
  const user = await requireEnthusiast();
  if (typeof rideId !== "string" || rideId === "") {
    return { ok: false, error: "That ride could not be found." };
  }

  assertMock();
  const s = store();
  const before = s.rides.length;
  s.rides = s.rides.filter((r) => !(r.id === rideId && r.user_id === user.id));
  if (s.rides.length === before) return { ok: false, error: "That ride could not be found." };

  revalidateRideViews();
  return { ok: true };
}

export async function setLeaderboardOptIn(optIn: boolean): Promise<ActionResult> {
  const user = await requireEnthusiast();

  assertMock();
  // Step 2: supabase.from("profiles").update({ leaderboard_opt_in: optIn })
  //         .eq("id", user.id)  — and RLS restricts the update to own row.
  const profile = store().profiles[user.id];
  if (!profile) return { ok: false, error: "Profile not found." };
  profile.leaderboardOptIn = Boolean(optIn);

  revalidateRideViews();
  return { ok: true };
}
