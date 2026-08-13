/**
 * Domain types. Field names are snake_case where they mirror a database column,
 * so the rows these describe are exactly what Supabase will return in step 2.
 */

export type CoasterType = "Steel" | "Wooden" | "Hybrid";

export const COASTER_TYPES: readonly CoasterType[] = ["Steel", "Wooden", "Hybrid"];

export type Coaster = {
  id: string;
  name: string;
  park: string;
  country: string;
  manufacturer: string;
  type: CoasterType;
};

export type Ride = {
  id: string;
  user_id: string;
  coaster_id: string;
  ridden_on: string; // ISO yyyy-mm-dd
  note: string | null;
};

/** A ride joined to its coaster — what every ride list in the UI renders. */
export type RideWithCoaster = Ride & { coaster: Coaster };

/**
 * The public leaderboard row. Exactly two fields, and it must stay that way:
 * CLAUDE.md §2 limits the board to a display name and a credit count, and the
 * component cannot render what it is never given.
 */
export type LeaderboardRow = {
  display_name: string;
  credit_count: number;
};

export type Role = "enthusiast" | "admin";

export type CurrentUser = {
  id: string;
  displayName: string;
  role: Role;
  leaderboardOptIn: boolean;
};
