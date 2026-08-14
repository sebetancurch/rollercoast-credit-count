import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Clients and fixtures for the RLS suite.
 *
 * These tests mutate and delete rows, so they must never reach a hosted
 * project. The defaults below are the local stack's — the anon key is the fixed
 * demo JWT the CLI emits on every machine, not a secret — and `assertLocal`
 * refuses to run against anything that is not loopback. That guard is the point
 * of hardcoding rather than reading a .env file that could say anything.
 */

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const url = process.env.SUPABASE_URL ?? LOCAL_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? LOCAL_ANON_KEY;

function assertLocal() {
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]") {
    throw new Error(
      `Refusing to run the RLS suite against ${url}. These tests delete rows; ` +
        `point SUPABASE_URL at a local stack (pnpm exec supabase start).`,
    );
  }
}

export type TestClient = SupabaseClient<Database>;

export function anonClient(): TestClient {
  assertLocal();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false } });
}

export async function signedInAs(email: string, password: string): Promise<TestClient> {
  assertLocal();
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `could not sign in ${email}: ${error.message}. Is the local stack seeded? ` +
        `(pnpm exec supabase db reset)`,
    );
  }
  return client;
}

/** Matches supabase/seed.sql exactly. Fixed ids, no lookups, no randomness. */
export const PASSWORD = "credit-count-dev";

export const users = {
  /** 62 rides across 36 coasters. Opted OUT of the leaderboard. */
  cass: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "cass@example.com",
    username: "Cass Ferreira",
  },
  /** 12 rides. Opted IN. */
  priya: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "priya@example.com",
    username: "Priya Raghavan",
  },
  /** Admin. Owns no rides at all — which is what makes the blindness testable. */
  rowan: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "rowan@example.com",
    username: "Rowan Selby",
  },
} as const;

export const seeded = {
  coasters: 47,
  cassRides: 62,
  cassCredits: 36,
  priyaRides: 12,
  boardMembers: 6,
} as const;

export const asCass = () => signedInAs(users.cass.email, PASSWORD);
export const asPriya = () => signedInAs(users.priya.email, PASSWORD);
export const asRowan = () => signedInAs(users.rowan.email, PASSWORD);
