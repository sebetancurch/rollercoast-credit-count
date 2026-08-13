import { requireAdmin } from "@/lib/auth/session";

/**
 * Admin section.
 *
 * Note what this layout does *not* wrap: any view of a user's rides. Admins
 * manage the catalogue and nothing else. In the database that will be expressed
 * as silence — no policy on `ride` grants an admin anything — rather than as a
 * rule that denies them.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
