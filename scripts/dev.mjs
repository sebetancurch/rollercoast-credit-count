/**
 * `next dev`, with room for a fat cookie jar.
 *
 * Node returns 431 Request Header Fields Too Large itself, before Next sees the
 * request, once the header block passes --max-http-header-size (16 KB by
 * default). Cookies are scoped by host and not by port, so `localhost` is one
 * shared jar across every dev server this machine has ever run: every project's
 * session cookies accumulate in it, and Supabase's own auth token is chunked
 * across several numbered cookies. The result is a dev server that appears
 * broken on localhost while working perfectly on any other hostname — which is
 * exactly the wrong conclusion to draw, since localhost is the origin worth
 * developing on (a bare IP is not a secure context in Chromium).
 *
 * Raising the limit does not fix a stale cookie jar; it stops one from taking
 * the dev server down while you notice. Clearing the site data for localhost is
 * still the actual remedy.
 *
 * Why an env var and not a flag: `next dev` runs the server in a child process
 * and rebuilds that child's NODE_OPTIONS from process.env — see
 * getParsedNodeOptions in node_modules/next/dist/cli/next-dev.js. A flag passed
 * to this process would never reach the process that binds the port.
 */

import { spawn } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HEADER_SIZE = 32768;

const nodeOptions = [process.env.NODE_OPTIONS, `--max-http-header-size=${HEADER_SIZE}`]
  .filter(Boolean)
  .join(" ");

// pnpm already puts node_modules/.bin on PATH for a script it runs; prepending
// it here means `node scripts/dev.mjs` works on its own too.
const binDir = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", ".bin");

const child = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true, // resolves the .cmd shim pnpm writes into node_modules/.bin on Windows
  env: {
    ...process.env,
    PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
    NODE_OPTIONS: nodeOptions,
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
