"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/app/dashboard/actions";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { COASTER_FORM_ERROR, coasterSchema } from "@/lib/validation";
import type { CoasterType } from "@/lib/types";

/**
 * Catalogue mutations — admins only.
 *
 * Every action re-reads the session, because rendering the page behind a guard
 * says nothing about who is POSTing here. The role check that actually holds is
 * the RLS policy on `coasters`, which calls is_admin() and so applies to any
 * request, including one that never touches this file.
 */

function revalidateCatalogue() {
  revalidatePath("/admin/coasters");
  // Ride views join the catalogue, so a rename or removal shows there too.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rides");
}

export async function createCoaster(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = coasterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: COASTER_FORM_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.from("coasters").insert({
    name: parsed.data.name,
    park: parsed.data.park,
    country: parsed.data.country,
    manufacturer: parsed.data.manufacturer,
    type: parsed.data.type as CoasterType,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Only admins can change the catalogue." };
    }
    return { ok: false, error: "Could not add that coaster." };
  }

  revalidateCatalogue();
  return { ok: true };
}

export async function updateCoaster(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = coasterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: COASTER_FORM_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coasters")
    .update({
      name: parsed.data.name,
      park: parsed.data.park,
      country: parsed.data.country,
      manufacturer: parsed.data.manufacturer,
      type: parsed.data.type as CoasterType,
    })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: "Could not save those changes." };
  if (!data || data.length === 0) {
    return { ok: false, error: "That coaster is no longer in the catalogue." };
  }

  revalidateCatalogue();
  return { ok: true };
}

export async function deleteCoaster(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (typeof id !== "string" || id === "") {
    return { ok: false, error: "That coaster is no longer in the catalogue." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coasters")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    // 23503: rides still reference it. `on delete restrict` is deliberate — a
    // cascade would silently rewrite other people's credit counts. Surface it
    // rather than swallowing it.
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Members have logged rides on this coaster, so it cannot be removed. " +
          "Removing it would change their credit counts.",
      };
    }
    return { ok: false, error: "Could not remove that coaster." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That coaster is no longer in the catalogue." };
  }

  revalidateCatalogue();
  return { ok: true };
}
