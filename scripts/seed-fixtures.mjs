/**
 * The seed, readable from JavaScript.
 *
 * supabase/seed.sql stays the single source of truth — this module parses it
 * rather than restating it. Two copies of 47 coasters and 62 rides would drift,
 * and the copy that drifted would be the one only the hosted environment ever
 * used, so nobody would notice.
 *
 * The coupling that buys is to seed.sql's *shape*, not just its contents: the
 * `seed_user(...)` call form, the two `values` blocks, and the filler table.
 * That coupling is deliberate and guarded — every extractor below asserts what
 * it found, so a reformat fails here with a specific message instead of
 * silently seeding half a database. tests/unit/seed-parity.test.ts runs the
 * whole thing with no network or database attached.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const SEED_PATH = join(here, "..", "supabase", "seed.sql");

/** Ids derived the way seed.sql derives them, from the catalogue migration. */
export const coasterId = (ord) =>
  `c0a57e00-0000-4000-8000-${String(ord).padStart(12, "0")}`;

export const PASSWORD = "credit-count-dev";
export const ADMIN_ID = "33333333-3333-4333-8333-333333333333";
export const OPTED_OUT_IDS = [
  "11111111-1111-4111-8111-111111111111", // Cass
  "5eed0000-0000-4000-8000-000000000012", // Leon
];
export const LEON_ID = "5eed0000-0000-4000-8000-000000000012";
export const CASS_ID = "11111111-1111-4111-8111-111111111111";

/**
 * Splits one `(...)` tuple into SQL values. Handles '' escapes inside strings,
 * `null`, bare numbers and the `::date` / `::uuid` casts the seed uses. Written
 * out rather than regexed because `'Canada''s Wonderland'` breaks the naive
 * version, and it is in the data.
 */
function parseTuple(body) {
  const out = [];
  let i = 0;

  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;

    if (body[i] === "'") {
      let value = "";
      i++;
      while (i < body.length) {
        if (body[i] === "'" && body[i + 1] === "'") {
          value += "'";
          i += 2;
        } else if (body[i] === "'") {
          i++;
          break;
        } else {
          value += body[i++];
        }
      }
      while (i < body.length && body[i] === ":") i += 2; // ::date, ::uuid
      while (i < body.length && /[a-z]/i.test(body[i])) i++;
      out.push(value);
    } else {
      let token = "";
      while (i < body.length && !/[,]/.test(body[i])) token += body[i++];
      token = token.trim();
      out.push(token.toLowerCase() === "null" ? null : Number(token));
    }
  }

  return out;
}

/**
 * Every `(...)` tuple in a `values` block.
 *
 * `after` is where to start looking and `until` is the first string that ends
 * the block — `;` for a statement, `) as b(` for an inline values table.
 */
function parseValuesBlock(sql, after, label, until = ";") {
  const start = sql.indexOf(after);
  if (start === -1) throw new Error(`seed.sql: could not find the ${label} block`);

  const block = sql.slice(start + after.length);
  const end = block.indexOf(until);
  const rows = [];

  let depth = 0;
  let current = "";
  for (const ch of block.slice(0, end === -1 ? undefined : end)) {
    if (ch === "(") {
      depth++;
      if (depth === 1) continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0) {
        rows.push(parseTuple(current));
        current = "";
        continue;
      }
    }
    if (depth > 0) current += ch;
  }

  if (rows.length === 0) throw new Error(`seed.sql: the ${label} block parsed to nothing`);
  return rows;
}

export function readSeed(path = SEED_PATH) {
  const sql = readFileSync(path, "utf8");

  // ── people ──────────────────────────────────────────────────────────────
  // The argument list goes through the same tokenizer as everything else, so a
  // display name containing an apostrophe cannot break the extraction. Anchored
  // on `select` so the `create function pg_temp.seed_user(...)` definition
  // above the calls is not itself read as a person.
  const people = [];
  for (const m of sql.matchAll(/select\s+pg_temp\.seed_user\(([^;]*?)\)\s*;/g)) {
    const [id, email, password, displayName] = parseTuple(m[1]);
    people.push({
      id,
      email,
      password,
      displayName,
      role: id === ADMIN_ID ? "admin" : "enthusiast",
      leaderboardOptIn: id !== ADMIN_ID && !OPTED_OUT_IDS.includes(id),
    });
  }
  if (people.length < 3) throw new Error("seed.sql: found fewer than 3 seed_user calls");
  for (const person of people) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(person.id ?? "")) {
      throw new Error(`seed.sql: parsed a person with a non-uuid id: ${person.id}`);
    }
    if (!person.email?.includes("@") || !person.displayName) {
      throw new Error(`seed.sql: parsed an incomplete person: ${JSON.stringify(person)}`);
    }
  }

  // ── catalogue slug → ordinal ────────────────────────────────────────────
  const coasters = parseValuesBlock(
    sql,
    "insert into coaster_seed (ord, slug, name, park, country, manufacturer, type) values",
    "coaster_seed",
  ).map(([ord, slug, name, park, country, manufacturer, type]) => ({
    ord,
    slug,
    name,
    park,
    country,
    manufacturer,
    type,
    id: coasterId(ord),
  }));

  const ordBySlug = new Map(coasters.map((c) => [c.slug, c.ord]));

  // ── Cass's hand-written history ─────────────────────────────────────────
  const cassRides = parseValuesBlock(
    sql,
    "insert into ride_seed (slug, ridden_on, note) values",
    "ride_seed",
  ).map(([slug, riddenOn, note]) => {
    const ord = ordBySlug.get(slug);
    if (ord === undefined) throw new Error(`seed.sql: ride references unknown slug ${slug}`);
    return { userId: CASS_ID, coasterId: coasterId(ord), riddenOn, note };
  });

  // ── the filler board, "first N coasters, one ride apiece" ───────────────
  const fillerRides = [];
  for (const [userId, n] of parseValuesBlock(
    sql,
    "from (values",
    "filler board",
    ") as b(user_id, n)",
  )) {
    for (const coaster of coasters.filter((c) => c.ord <= n)) {
      fillerRides.push({
        userId,
        coasterId: coaster.id,
        riddenOn: addDays("2025-01-05", coaster.ord),
        note: null,
      });
    }
  }

  // ── Leon: every even-ordinal coaster, twice, a year apart ───────────────
  // Generated in seed.sql too, so this is a re-implementation rather than a
  // parse. The parity test asserts the totals seed.sql itself asserts.
  const leonRides = [];
  for (const visit of [0, 1]) {
    for (const coaster of coasters.filter((c) => c.ord % 2 === 0)) {
      leonRides.push({
        userId: LEON_ID,
        coasterId: coaster.id,
        riddenOn: addDays("2024-04-01", coaster.ord + visit * 365),
        note: null,
      });
    }
  }

  return { people, coasters, rides: [...cassRides, ...fillerRides, ...leonRides] };
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
