"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/app/dashboard/actions";
import { requireAdmin } from "@/lib/auth/session";
import { isMockMode } from "@/lib/env";
import { nextId, store } from "@/lib/mock/store";
import { COASTER_FORM_ERROR, coasterSchema } from "@/lib/validation";
import type { CoasterType } from "@/lib/types";

/**
 * Catalogue mutations — admins only.
 *
 * Every action re-reads the session and checks the role, because rendering the
 * page behind a guard says nothing about who is POSTing to the action. In
 * step 2 the same restriction is expressed as RLS policies on `coasters` that
 * grant INSERT, UPDATE and DELETE to admins alone, which is what will hold when
 * someone bypasses the UI entirely.
 */

function assertMock() {
  if (!isMockMode) {
    throw new Error("Supabase writes are not wired up yet. Leave USE_MOCK_DATA=true.");
  }
}

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

  assertMock();
  // Step 2: supabase.from("coasters").insert(parsed.data)
  store().coasters.push({
    id: nextId("coaster"),
    name: parsed.data.name,
    park: parsed.data.park,
    country: parsed.data.country,
    manufacturer: parsed.data.manufacturer,
    type: parsed.data.type as CoasterType,
  });

  revalidateCatalogue();
  return { ok: true };
}

export async function updateCoaster(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = coasterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: COASTER_FORM_ERROR };

  assertMock();
  const coaster = store().coasters.find((c) => c.id === id);
  if (!coaster) return { ok: false, error: "That coaster is no longer in the catalogue." };

  coaster.name = parsed.data.name;
  coaster.park = parsed.data.park;
  coaster.country = parsed.data.country;
  coaster.manufacturer = parsed.data.manufacturer;
  coaster.type = parsed.data.type as CoasterType;

  revalidateCatalogue();
  return { ok: true };
}

export async function deleteCoaster(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (typeof id !== "string" || id === "") {
    return { ok: false, error: "That coaster is no longer in the catalogue." };
  }

  assertMock();
  const s = store();
  const before = s.coasters.length;
  s.coasters = s.coasters.filter((c) => c.id !== id);
  if (s.coasters.length === before) {
    return { ok: false, error: "That coaster is no longer in the catalogue." };
  }

  // Rides pointing at it are orphaned. The database will settle this with a
  // foreign key — restrict, or cascade — which is a step-2 decision; the mock
  // read layer simply drops them.

  revalidateCatalogue();
  return { ok: true };
}
