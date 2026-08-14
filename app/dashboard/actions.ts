"use server";

import { revalidatePath } from "next/cache";

import { requireEnthusiast } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
 *   3. user_id comes from the verified session and never from the arguments.
 *
 * The `eq("user_id", ...)` filters below are belt and braces. RLS is what
 * actually stops one user reaching another's rides — tests/rls/ride.test.ts and
 * supabase/tests/ride_rls.test.sql prove it, including the case where a
 * hand-crafted request bypasses this file entirely.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

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

  const supabase = await createClient();
  const { error } = await supabase.from("ride").insert({
    user_id: user.id,
    coaster_id: parsed.data.coasterId,
    ridden_on: parsed.data.riddenOn,
    note: parsed.data.note,
  });

  if (error) {
    // 23503: the coaster was removed between the dialog opening and saving.
    // 23514: the date failed the not-in-the-future check.
    if (error.code === "23503") {
      return { ok: false, error: "That coaster is no longer in the catalogue." };
    }
    if (error.code === "23514") {
      return { ok: false, error: "That date is in the future." };
    }
    return { ok: false, error: "Could not save that ride." };
  }

  revalidateRideViews();
  return { ok: true };
}

export async function updateRide(input: unknown): Promise<ActionResult> {
  const user = await requireEnthusiast();

  const parsed = updateRideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: Object.values(fieldErrors(parsed.error))[0] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ride")
    .update({ ridden_on: parsed.data.riddenOn, note: parsed.data.note })
    .eq("id", parsed.data.rideId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    if (error.code === "23514") return { ok: false, error: "That date is in the future." };
    return { ok: false, error: "Could not save those changes." };
  }
  // An update that matches no row under RLS succeeds silently and returns
  // nothing — so an empty result is the "not yours, or not there" case.
  if (!data || data.length === 0) {
    return { ok: false, error: "That ride could not be found." };
  }

  revalidateRideViews();
  return { ok: true };
}

export async function deleteRide(rideId: string): Promise<ActionResult> {
  const user = await requireEnthusiast();
  if (typeof rideId !== "string" || rideId === "") {
    return { ok: false, error: "That ride could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ride")
    .delete()
    .eq("id", rideId)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { ok: false, error: "Could not delete that ride." };
  if (!data || data.length === 0) {
    return { ok: false, error: "That ride could not be found." };
  }

  revalidateRideViews();
  return { ok: true };
}

export async function setLeaderboardOptIn(optIn: boolean): Promise<ActionResult> {
  const user = await requireEnthusiast();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ leaderboard_opt_in: Boolean(optIn) })
    .eq("id", user.id)
    .select("id");

  if (error) return { ok: false, error: "Could not change that setting." };
  if (!data || data.length === 0) return { ok: false, error: "Profile not found." };

  revalidateRideViews();
  return { ok: true };
}
