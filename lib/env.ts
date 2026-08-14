/**
 * Environment reading, in one place.
 *
 * Only these two carry the NEXT_PUBLIC_ prefix, and that is deliberate: they
 * are inlined into the browser bundle at build time. The anon key is meant to
 * be public — it grants nothing on its own, because RLS decides what its bearer
 * can see. That is why the policies matter so much, and why a service-role key
 * must never appear in a NEXT_PUBLIC_ variable, or in this file at all.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill in the values ` +
        `printed by \`pnpm exec supabase start\`.`,
    );
  }
  return value;
}

export const supabaseUrl = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const supabaseAnonKey = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
