import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { NavLink } from "@/components/nav-link";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Role-aware navigation, on the design's dark navy band.
 *
 * A visitor sees the leaderboard and the way in. An enthusiast additionally
 * sees their dashboard and ride history. An admin sees the catalogue — and no
 * dashboard or ride history, because those belong to enthusiasts and admins
 * have no business in anyone's ride data.
 *
 * Hiding a link is presentation, not protection. The layouts under /dashboard
 * and /admin guard themselves, and RLS is what actually decides.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="cc-header">
      <nav className="nav cc-nav" aria-label="Main">
        {/* The skewed cyan bar before the wordmark is drawn by .nav-brand::before */}
        <Link href="/" className="nav-brand">
          Credit Count
        </Link>

        <NavLink href="/" label="Leaderboard" />

        {user?.role === "enthusiast" ? (
          <>
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink
              href="/dashboard/rides"
              label="My rides"
              section={["/dashboard/rides", "/dashboard/coasters"]}
            />
          </>
        ) : null}

        {user?.role === "admin" ? (
          <NavLink href="/admin/coasters" label="Catalogue" section={["/admin"]} />
        ) : null}

        {!user ? (
          <div className="cc-nav-actions cc-nav-actions--tight">
            <Link href="/login" className="btn btn-on-dark">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Sign up
            </Link>
          </div>
        ) : (
          <div className="cc-nav-actions">
            {user.role === "enthusiast" ? (
              <Link href="/dashboard?log=1" className="btn btn-primary cc-nowrap">
                Log a ride
              </Link>
            ) : null}

            <div className="cc-identity">
              <span className="cc-identity-name">{user.displayName}</span>
              <span
                className={
                  user.role === "admin"
                    ? "cc-identity-role cc-identity-role--admin"
                    : "cc-identity-role"
                }
              >
                {user.role === "admin" ? "Admin" : "Enthusiast"}
              </span>
            </div>

            <form action={signOut}>
              <button type="submit" className="btn btn-ghost-on-dark">
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>
    </header>
  );
}
