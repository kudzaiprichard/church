import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for pure logic — permissions, scopes, schemas, dates, money.
 *
 * Node environment, not jsdom: nothing under test renders, and Next's own
 * guidance is that async Server Components belong to end-to-end tests rather
 * than Vitest. Integration tests against Postgres arrive in Phase 6 with their
 * own config.
 *
 * `server-only` throws on import outside the react-server condition, which is
 * exactly what it is for in the app and exactly wrong here, so it resolves to
 * an empty module under test.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
