/**
 * In-memory mock store.
 *
 * A module singleton pinned to globalThis so it survives dev-server HMR the way
 * a database connection would. It does NOT survive a server restart, which is
 * fine: it exists only so the dialogs can be walked end to end while the real
 * schema is being written, and it is deleted in step 2.
 *
 * Note what is absent: no credit total is stored here. Credits are recomputed
 * from the ride list on every read (lib/stats.ts), exactly as CLAUDE.md §3
 * requires of the database.
 */

import "server-only";

import {
  MOCK_ADMIN_ID,
  MOCK_ADMIN_NAME,
  MOCK_COASTERS,
  MOCK_ENTHUSIAST_ID,
  MOCK_ENTHUSIAST_NAME,
  MOCK_RIDES,
} from "@/lib/mock/fixtures";
import type { Coaster, Ride } from "@/lib/types";

export type MockProfile = {
  id: string;
  displayName: string;
  leaderboardOptIn: boolean;
};

type MockState = {
  coasters: Coaster[];
  rides: Ride[];
  profiles: Record<string, MockProfile>;
  nextId: number;
};

function initialState(): MockState {
  return {
    coasters: MOCK_COASTERS.map((c) => ({ ...c })),
    rides: MOCK_RIDES.map((r) => ({ ...r })),
    profiles: {
      [MOCK_ENTHUSIAST_ID]: {
        id: MOCK_ENTHUSIAST_ID,
        displayName: MOCK_ENTHUSIAST_NAME,
        leaderboardOptIn: false,
      },
      [MOCK_ADMIN_ID]: {
        id: MOCK_ADMIN_ID,
        displayName: MOCK_ADMIN_NAME,
        leaderboardOptIn: false,
      },
    },
    nextId: 1,
  };
}

const globalRef = globalThis as typeof globalThis & { __ccMockStore?: MockState };

export function store(): MockState {
  globalRef.__ccMockStore ??= initialState();
  return globalRef.__ccMockStore;
}

/** Monotonic ids — no Date.now(), so repeated runs behave identically. */
export function nextId(prefix: string): string {
  const s = store();
  s.nextId += 1;
  return `${prefix}-${s.nextId}`;
}

/**
 * The prototype's "New account" / "62 rides" switch, and what signing up does.
 *
 * This mutates the store rather than filtering reads, so the dashboard, the
 * ride history and the leaderboard can never disagree about how many rides a
 * user has — the same reason CLAUDE.md §3 forbids a stored credit total.
 */
export function setRideHistory(userId: string, seeded: boolean): void {
  const s = store();
  s.rides = s.rides.filter((r) => r.user_id !== userId);
  if (seeded) {
    s.rides.push(...MOCK_RIDES.filter((r) => r.user_id === userId).map((r) => ({ ...r })));
  }
}

export function hasRideHistory(userId: string): boolean {
  return store().rides.some((r) => r.user_id === userId);
}
