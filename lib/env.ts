/**
 * Environment reading, in one place.
 *
 * Only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY carry the
 * NEXT_PUBLIC_ prefix — those two are inlined into the browser bundle on
 * purpose. Everything else here is server-only.
 */

/** The value .env.example ships. Its presence means "not configured yet". */
const PLACEHOLDER_ANON_KEY = "replace-with-local-anon-key-from-supabase-start";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True once a real Supabase project (local or hosted) is reachable. */
export const isSupabaseConfigured =
  supabaseUrl !== "" &&
  supabaseAnonKey !== "" &&
  supabaseAnonKey !== PLACEHOLDER_ANON_KEY;

/**
 * Mock mode serves the fixtures in lib/mock and takes the session from the dev
 * role switcher instead of Supabase Auth.
 *
 * It stays on whenever Supabase is not configured, so the app runs out of the
 * box without a .env.local. Setting USE_MOCK_DATA=true forces it on even when a
 * project *is* configured, which is what makes the UI reviewable while the
 * schema and RLS policies are still being written.
 *
 * Deleted in step 2 along with lib/mock.
 */
export const isMockMode =
  process.env.USE_MOCK_DATA === "true" || !isSupabaseConfigured;
