/**
 * Load the seed into a hosted Supabase project.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
 *   node scripts/seed-remote.mjs
 *
 * supabase/seed.sql cannot do this job. It writes auth.users and
 * auth.identities directly, which is fine as the superuser `supabase db reset`
 * runs as and wrong everywhere else — GoTrue owns those tables and their
 * invariants. Hosted accounts go through the Admin API instead, which is the
 * same path a real signup takes and therefore fires the same
 * on_auth_user_created trigger.
 *
 * The data itself is not restated here: scripts/seed-fixtures.mjs reads it out
 * of seed.sql, so the two environments cannot drift apart.
 *
 * On the service-role key: it bypasses RLS completely, which is the entire
 * reason this script can write another user's rides. It is read from the
 * environment, is never NEXT_PUBLIC_, never reaches lib/env.ts, and must never
 * be committed. Nothing in the app may ever import it.
 *
 * Idempotent: every user is looked up before being created and every ride is
 * matched on (user, coaster, date), so re-running tops up rather than
 * duplicating.
 */

import { createClient } from "@supabase/supabase-js";

import { readSeed } from "./seed-fixtures.mjs";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Both are in the Supabase dashboard under Project Settings → API.\n" +
      "Do not put the service-role key in .env.local — it bypasses RLS and the\n" +
      "app must never see it. Pass it on the command line for this one run.",
  );
  process.exit(1);
}

// The mirror image of assertLocal() in tests/support/clients.ts. That guard
// keeps the destructive suite off a hosted project; this one keeps a script
// that mints confirmed accounts off the local stack, where `pnpm db:reset` is
// the correct tool and would undo this anyway.
const host = new URL(url).hostname;
if (host === "127.0.0.1" || host === "localhost" || host === "[::1]") {
  console.error(
    `Refusing to run against ${url}. This script is for hosted projects; ` +
      `seed a local stack with \`pnpm db:reset\`.`,
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { people, coasters, rides } = readSeed();

/** Every existing account, by email. The Admin API pages at 50 by default. */
async function existingUsersByEmail() {
  const byEmail = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const user of data.users) byEmail.set(user.email, user.id);
    if (data.users.length < 200) break;
  }
  return byEmail;
}

console.log(`Seeding ${url}`);

// ── the catalogue ──────────────────────────────────────────────────────────
// Reference data, so it arrives with the migration rather than from here. This
// only reports, because a mismatch means the migrations have not all been
// pushed and every ride insert below would fail on the foreign key.
{
  const { count, error } = await supabase
    .from("coasters")
    .select("id", { count: "exact", head: true });
  if (error) throw error;

  if (count !== coasters.length) {
    console.error(
      `The catalogue has ${count} coasters, the seed expects ${coasters.length}.\n` +
        `Push the migrations first: \`pnpm exec supabase db push\`.`,
    );
    process.exit(1);
  }
  console.log(`  catalogue: ${count} coasters already present`);
}

// ── people ─────────────────────────────────────────────────────────────────
const existing = await existingUsersByEmail();
const idFor = new Map();
let created = 0;

for (const person of people) {
  const already = existing.get(person.email);
  if (already) {
    idFor.set(person.id, already);
    continue;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: person.email,
    password: person.password,
    // Hosted projects have email confirmation on. Nobody is going to click a
    // link for eighteen fictional enthusiasts.
    email_confirm: true,
    // Read by handle_new_user() to name the profile. The trigger ignores
    // everything else here, role included — which is why role is set below
    // rather than asked for.
    user_metadata: { display_name: person.displayName },
  });
  if (error) throw new Error(`creating ${person.email}: ${error.message}`);

  idFor.set(person.id, data.user.id);
  created++;
}

console.log(`  people: ${created} created, ${people.length - created} already there`);

// ── role and opt-in ────────────────────────────────────────────────────────
// The trigger hardcodes 'enthusiast' and opt-in off, deliberately: a signup
// payload is client-controlled. Both are corrected here, with the service role.
for (const person of people) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: person.role, leaderboard_opt_in: person.leaderboardOptIn })
    .eq("id", idFor.get(person.id));
  if (error) throw new Error(`updating profile for ${person.email}: ${error.message}`);
}

console.log(`  profiles: roles and opt-in set`);

// ── rides ──────────────────────────────────────────────────────────────────
// Matched on the same three columns the local seed would produce, so a second
// run inserts nothing.
const { data: presentRides, error: presentError } = await supabase
  .from("ride")
  .select("user_id, coaster_id, ridden_on");
if (presentError) throw presentError;

const present = new Set(
  (presentRides ?? []).map((r) => `${r.user_id}|${r.coaster_id}|${r.ridden_on}`),
);

const toInsert = rides
  .map((ride) => ({
    user_id: idFor.get(ride.userId),
    coaster_id: ride.coasterId,
    ridden_on: ride.riddenOn,
    note: ride.note,
  }))
  .filter((ride) => !present.has(`${ride.user_id}|${ride.coaster_id}|${ride.ridden_on}`));

for (let i = 0; i < toInsert.length; i += 500) {
  const batch = toInsert.slice(i, i + 500);
  const { error } = await supabase.from("ride").insert(batch);
  if (error) throw new Error(`inserting rides: ${error.message}`);
}

console.log(`  rides: ${toInsert.length} inserted, ${rides.length - toInsert.length} already there`);

// ── what a visitor will now see ────────────────────────────────────────────
const { data: board, error: boardError } = await supabase
  .from("public_leaderboard")
  .select("display_name, credit_count")
  .order("credit_count", { ascending: false });
if (boardError) throw boardError;

console.log(`\nLeaderboard now has ${board.length} members. Top five:`);
for (const [i, row] of board.slice(0, 5).entries()) {
  console.log(`  ${i + 1}. ${row.display_name} — ${row.credit_count}`);
}
console.log(`\nEvery seeded account signs in with the password in supabase/seed.sql.`);
console.log(`Those are development credentials. Do not reuse them anywhere real.`);
