import { LogRideLauncher } from "@/components/log-ride-launcher";
import { requireEnthusiast } from "@/lib/auth/session";
import { listCoasters } from "@/lib/data/coasters";
import { getRideCountsByCoaster } from "@/lib/data/rides";

/**
 * Everything under /dashboard is one enthusiast's own data.
 *
 * The guard here redirects an admin or a visitor somewhere useful. It is a
 * convenience, not the boundary — an admin gets no RLS policy on `ride` at all,
 * which is what will actually make this data unreachable for them. Those
 * policies arrive in step 2; until then this guard is all there is.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireEnthusiast();

  // The log-a-ride dialog is mounted once here so `?log=1` opens it from any
  // page in this section.
  const [coasters, rideCounts] = await Promise.all([
    listCoasters(),
    getRideCountsByCoaster(user.id),
  ]);

  return (
    <>
      {children}
      <LogRideLauncher coasters={coasters} rideCounts={rideCounts} />
    </>
  );
}
