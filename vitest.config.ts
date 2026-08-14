import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "server-only": resolve(root, "tests/unit/server-only.stub.ts"),
    },
  },
  test: {
    // Unit tests are pure. The RLS suite needs the local stack running
    // (pnpm exec supabase start && pnpm exec supabase db reset) and refuses to
    // point anywhere but loopback — see tests/support/clients.ts.
    // Playwright owns e2e/ and is not run by vitest.
    include: ["tests/unit/**/*.test.ts", "tests/rls/**/*.test.ts"],
    environment: "node",
    // Real HTTP against a local Postgres; the default 5s is tight for the first
    // sign-in while the stack warms up.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // The RLS specs mutate shared rows, so they must not interleave.
    fileParallelism: false,
  },
});
