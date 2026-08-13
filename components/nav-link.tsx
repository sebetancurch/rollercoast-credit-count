"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A nav link that knows whether it is the current section. Client-side purely
 * because the pathname is not available to a server component; the header
 * around it stays on the server.
 */
export function NavLink({
  href,
  label,
  section,
}: {
  href: Route;
  /** Prefixes that also count as "you are here" — e.g. a coaster page under My rides. */
  section?: string[];
  label: string;
}) {
  const pathname = usePathname();
  const current =
    pathname === href || (section ?? []).some((prefix) => pathname.startsWith(prefix));

  return (
    <Link href={href} className="cc-nav-link" aria-current={current ? "page" : undefined}>
      {label}
    </Link>
  );
}
