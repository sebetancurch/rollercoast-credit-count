/**
 * Per-request server client, for server components, server actions and route
 * handlers.
 *
 * Built fresh on every call and never hoisted to a module-level constant — a
 * shared instance would leak one user's session into another user's request.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // getAll/setAll, not the deprecated get/set/remove triple — the older
      // one drops cookie chunks for large sessions.
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. Harmless: middleware has
          // already refreshed the session for this request.
        }
      },
    },
  });
}
