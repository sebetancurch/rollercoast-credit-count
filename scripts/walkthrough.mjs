/**
 * End-to-end walkthrough against a running dev server and the local stack.
 *
 * Signs in through supabase-js, writes the session into the cookie shape
 * @supabase/ssr expects, and requests the real pages — so this exercises the
 * server components, the proxy and RLS together, which no unit or RLS test does.
 *
 *   pnpm exec supabase start && pnpm exec supabase db reset
 *   pnpm dev
 *   node scripts/walkthrough.mjs
 */
import { createClient } from "@supabase/supabase-js";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const PASSWORD = "credit-count-dev";

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
};

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The cookie @supabase/ssr reads: sb-<first host label>-auth-token, base64-json. */
async function cookieFor(email) {
  const client = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);

  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const value = `base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}`;
  return `sb-${ref}-auth-token=${value}`;
}

async function get(path, cookie) {
  const res = await fetch(APP + path, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  const location = res.headers.get("location");
  const body = res.status >= 300 && res.status < 400 ? "" : strip(await res.text());
  return { status: res.status, location, body };
}

const cass = await cookieFor("cass@example.com");
const rowan = await cookieFor("rowan@example.com");

console.log("=== visitor ===");
const home = await get("/");
check("leaderboard renders the six opted-in members", home.body.includes("woodie_wendy"));
check("ranked by credits", /1 woodie_wendy 30/.test(home.body), home.body.match(/1 \w+ \d+/)?.[0]);
check("Cass is absent while opted out", !home.body.includes("Cass Ferreira"));
check("sign in / sign up offered", home.body.includes("Sign in") && home.body.includes("Sign up"));
for (const p of ["/dashboard", "/dashboard/rides", "/admin/coasters"]) {
  const r = await get(p);
  check(`visitor is redirected from ${p}`, r.status === 307 && r.location?.endsWith("/login"), `${r.status} ${r.location ?? ""}`);
}

console.log("\n=== enthusiast ===");
const dash = await get("/dashboard", cass);
const credits = dash.body.match(/Credits\s+(\d+)\s+Unique coasters/i)?.[1];
const rides = dash.body.match(/Total rides\s+(\d+)/i)?.[1];
check("dashboard headline is 36 credits", credits === "36", `got ${credits}`);
check("total rides is 62", rides === "62", `got ${rides}`);
check("credits and rides disagree", credits !== rides);
check("15 repeat coasters", dash.body.includes("15 coasters ridden more than once"));
check("most ridden is Nemesis, 7 rides", /Most ridden Nemesis 7 rides · Alton Towers/.test(dash.body));
check("opt-in toggle reads off", dash.body.includes("Off — your credits are private"));
check("country legend has United Kingdom 11", dash.body.includes("United Kingdom 11"));
check("map is server-rendered", (await (await fetch(APP + "/dashboard", { headers: { cookie: cass } })).text()).includes("<path"));
check("nav shows Dashboard and My rides", dash.body.includes("Dashboard") && dash.body.includes("My rides"));
check("nav has no Catalogue link", !dash.body.includes("Catalogue"));

const ridesPage = await get("/dashboard/rides", cass);
check("ride history meta line", ridesPage.body.includes("62 rides · 36 credits · private to you"));
check("newest ride first", /4 Jul 2026\s+Valkyria/.test(ridesPage.body));
check("privacy copy restored to present tense", ridesPage.body.includes("enforced in the database, not just here"));

console.log("\n=== coaster detail ===");
const nemesisId = await (async () => {
  const c = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email: "cass@example.com", password: PASSWORD });
  const { data } = await c.from("coasters").select("id").eq("name", "Nemesis").single();
  return data.id;
})();
const coaster = await get(`/dashboard/coasters/${nemesisId}`, cass);
check("one credit, seven rides", /One credit, 7 rides/.test(coaster.body));
check("community counts shown", /members have logged this coaster/.test(coaster.body));
check("no other member is named", !coaster.body.includes("Priya"));

console.log("\n=== admin ===");
const cat = await get("/admin/coasters", rowan);
check("catalogue summary", cat.body.includes("47 coasters · 10 countries · 14 manufacturers"));
check("duplicate pair flagged", (cat.body.match(/Possible duplicate/g) ?? []).length >= 2);
check("duplicate count is 2", cat.body.includes("Possible duplicates (2)"));
check("admin nav has no Dashboard", !cat.body.includes("Dashboard"));
check("admin nav has no My rides", !cat.body.includes("My rides"));
check("privacy copy restored", cat.body.includes("enforced at the database layer"));
const adminDash = await get("/dashboard", rowan);
check("admin is redirected off /dashboard", adminDash.status === 307, `${adminDash.status} ${adminDash.location ?? ""}`);
const enthusiastCat = await get("/admin/coasters", cass);
check("enthusiast is redirected off /admin", enthusiastCat.status === 307, `${enthusiastCat.status} ${enthusiastCat.location ?? ""}`);

console.log("\n=== auth pages ===");
const login = await get("/login");
check("login renders", login.body.includes("Welcome back"));
check("signed-in user is redirected off /login", (await get("/login", cass)).status === 307);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
