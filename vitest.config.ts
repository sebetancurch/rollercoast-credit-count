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
    // Unit tests only for now. tests/rls/ and tests/integration/ arrive with the
    // database in step 2 (see .claude/skills/e2e-tester), and Playwright owns e2e/.
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
