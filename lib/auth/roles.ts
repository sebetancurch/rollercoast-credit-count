/**
 * Role constants, kept free of `server-only` and `next/headers` so middleware
 * (edge runtime) and client components can import them too.
 */

import type { Route } from "next";

import type { Role } from "@/lib/types";

/** Mock-only. Deleted in step 2 with the rest of the role switcher. */
export const ROLE_COOKIE = "cc_mock_role";

export type MockRole = Role | "visitor";

export const MOCK_ROLES: readonly MockRole[] = ["visitor", "enthusiast", "admin"];

export function isMockRole(value: string): value is MockRole {
  return (MOCK_ROLES as readonly string[]).includes(value);
}

/** Where each role lands after signing in or switching. */
export const HOME_FOR_ROLE: Record<MockRole, Route> = {
  visitor: "/",
  enthusiast: "/dashboard",
  admin: "/admin/coasters",
};
