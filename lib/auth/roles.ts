/**
 * Role constants, kept free of `server-only` and `next/headers` so the proxy
 * (edge runtime) and client components can import them too.
 */

import type { Route } from "next";

import type { Role } from "@/lib/types";

/** Where each role lands after signing in. */
export const HOME_FOR_ROLE: Record<Role, Route> = {
  enthusiast: "/dashboard",
  admin: "/admin/coasters",
};
