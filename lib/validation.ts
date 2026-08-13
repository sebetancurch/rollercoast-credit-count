/**
 * Input schemas for the server actions.
 *
 * A server action is a public HTTP endpoint — every argument is hostile until
 * parsed. Note what is absent from all of these: no user_id. Who is acting
 * comes from the verified session, never from the payload.
 *
 * The messages are the design's own copy, so the rendered errors match the
 * approved prototype word for word.
 */

import { z } from "zod";

import { COASTER_TYPES } from "@/lib/types";

const email = z.email("Enter a valid email address.");
const password = z.string().min(8, "At least 8 characters.");

export const signInSchema = z.object({ email, password });

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Pick a display name — this is what the leaderboard would show."),
  email,
  password,
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date you rode it.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Pick the date you rode it.");

const note = z
  .string()
  .trim()
  .max(500, "Keep the note under 500 characters.")
  .transform((v) => (v === "" ? null : v));

export const logRideSchema = z.object({
  coasterId: z.string().min(1, "Choose a coaster from the catalogue."),
  riddenOn: isoDate,
  note: note.optional().default(null),
});

export const updateRideSchema = z.object({
  rideId: z.string().min(1),
  riddenOn: isoDate,
  note: note.optional().default(null),
});

const required = (field: string) => z.string().trim().min(1, `${field} is required.`);

export const coasterSchema = z.object({
  name: required("Name"),
  park: required("Park"),
  country: required("Country"),
  manufacturer: required("Manufacturer"),
  type: z.enum(COASTER_TYPES as unknown as [string, ...string[]]),
});

export type LogRideInput = z.infer<typeof logRideSchema>;
export type UpdateRideInput = z.infer<typeof updateRideSchema>;
export type CoasterInput = z.infer<typeof coasterSchema>;

/**
 * First error per field, keyed by field name — the shape the forms render.
 * Built from `issues` rather than a helper so it survives zod minor versions.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** The catalogue form shows one line, not per-field errors — match the design. */
export const COASTER_FORM_ERROR =
  "Name, park, country and manufacturer are all required.";
