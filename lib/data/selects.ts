/**
 * PostgREST select strings, kept apart from the query modules.
 *
 * These are plain strings describing a response shape, so they carry no
 * `server-only` marker and no dependency on the client factories. That lets the
 * RLS suite import the exact string the application uses and assert the shape
 * PostgREST returns for it — the modules that run these queries cast the result,
 * and a cast is invisible to the type checker.
 */

/** A ride joined to its coaster. `!inner` so a ride without one is dropped. */
export const RIDE_SELECT =
  "id, user_id, coaster_id, ridden_on, note, created_at, " +
  "coaster:coasters!inner(id, name, park, country, manufacturer, type)";

/** Every column of a coaster the UI renders. Never `*`. */
export const COASTER_SELECT = "id, name, park, country, manufacturer, type";
