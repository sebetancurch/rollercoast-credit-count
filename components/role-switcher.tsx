"use client";

import { useTransition } from "react";

import { setMockRole, setMockRideHistory } from "@/app/(auth)/actions";
import { MOCK_ROLES, type MockRole } from "@/lib/auth/roles";

/**
 * Development-only "View as" bar, carried over from the design prototype.
 *
 * It exists because there is no auth yet and every role's views still need to
 * be reviewable. It renders only when USE_MOCK_DATA is on, and it is deleted in
 * step 2 along with lib/mock — at which point the way to see the admin views is
 * to sign in as an admin.
 */

const LABELS: Record<MockRole, string> = {
  visitor: "Visitor",
  enthusiast: "Enthusiast",
  admin: "Admin",
};

export function RoleSwitcher({ role, seeded }: { role: MockRole; seeded: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="cc-switcher">
      <span className="cc-switcher-note">Prototype — all data mocked</span>

      {role === "enthusiast" ? (
        <div className="seg" role="group" aria-label="Ride history">
          <button
            type="button"
            className="seg-opt"
            aria-pressed={seeded}
            disabled={pending}
            onClick={() => startTransition(() => setMockRideHistory(true))}
          >
            62 rides
          </button>
          <button
            type="button"
            className="seg-opt"
            aria-pressed={!seeded}
            disabled={pending}
            onClick={() => startTransition(() => setMockRideHistory(false))}
          >
            New account
          </button>
        </div>
      ) : null}

      <span className="cc-switcher-label" id="cc-view-as">
        View as
      </span>
      <div className="seg" role="group" aria-labelledby="cc-view-as">
        {MOCK_ROLES.map((option) => (
          <button
            key={option}
            type="button"
            className="seg-opt"
            aria-pressed={role === option}
            disabled={pending}
            onClick={() => startTransition(() => setMockRole(option))}
          >
            {LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
