/** Browser client. Only for files carrying "use client". */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

export const createClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
