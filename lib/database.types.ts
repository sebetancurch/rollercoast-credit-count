/**
 * PLACEHOLDER — hand-written, and the only version of this file that ever will
 * be. Step 2 overwrites it wholesale with:
 *
 *     supabase gen types typescript --local > lib/database.types.ts
 *
 * after which it is generated output and must never be hand-edited. It exists
 * now so the client factories in lib/supabase/ are typed and so the column
 * names the data layer will query are written down somewhere.
 *
 * Shape follows docs/DB Model.png and the TDD, with two deliberate departures:
 *
 *  - `users` becomes `profiles`. Supabase Auth owns email and password in
 *    auth.users; a public mirror table holds the profile fields RLS policies
 *    and the leaderboard view need.
 *  - the ride's `date` column becomes `ridden_on`, matching the migration
 *    sketch in .claude/skills/supabase-patterns.
 *
 * Whether `role` stays a text column or becomes a foreign key to a `role`
 * table (as the ER diagram draws it) is a step-2 decision.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          role: "enthusiast" | "admin";
          leaderboard_opt_in: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          role?: "enthusiast" | "admin";
          leaderboard_opt_in?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          role?: "enthusiast" | "admin";
          leaderboard_opt_in?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      coasters: {
        Row: {
          id: string;
          name: string;
          park: string;
          country: string;
          manufacturer: string;
          type: "Steel" | "Wooden" | "Hybrid";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          park: string;
          country: string;
          manufacturer: string;
          type: "Steel" | "Wooden" | "Hybrid";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          park?: string;
          country?: string;
          manufacturer?: string;
          type?: "Steel" | "Wooden" | "Hybrid";
          created_at?: string;
        };
        Relationships: [];
      };
      ride: {
        Row: {
          id: string;
          user_id: string;
          coaster_id: string;
          ridden_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          coaster_id: string;
          ridden_on: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          coaster_id?: string;
          ridden_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      /**
       * Two columns, and it must stay that way. No id of any kind: PostgREST
       * lets a caller filter on any exposed column, so a user_id here would
       * turn the leaderboard into a per-user lookup.
       */
      public_leaderboard: {
        Row: {
          display_name: string;
          credit_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
