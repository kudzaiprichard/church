import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Integration tests against a real Postgres (docs/SCOPE.md §10): every
 * `src/lib/data/*` read, called as each office, must return exactly the rows
 * the permission matrix allows.
 *
 * `global-setup.ts` creates a fresh database for the run, applies every
 * migration, seeds a fixed cast and drops the database afterwards — nothing
 * here touches a database anyone uses. Files run one at a time against it.
 *
 *   npm run test:integration
 *
 * Needs a reachable Postgres: TEST_DATABASE_URL, or DATABASE_URL, names the
 * server (the database part is replaced by a throwaway name).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.it.test.ts"],
    globalSetup: ["./src/test/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
