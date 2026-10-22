import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import "dotenv/config";
import pg from "pg";

import { seedFixture } from "./fixture";

/**
 * One throwaway database per run.
 *
 * The server comes from TEST_DATABASE_URL (CI) or DATABASE_URL (a developer's
 * machine); only its host and credentials are used. A database named
 * `church_it_<random>` is created, migrated with `prisma migrate deploy` and
 * seeded, and its URL handed to the test workers through DATABASE_URL. The
 * teardown drops it — and only it: the name is checked before dropping.
 */
export default async function setup() {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL) to a Postgres server.");

  const name = `church_it_${randomBytes(4).toString("hex")}`;
  const admin = new URL(base);
  admin.pathname = "/postgres";
  admin.search = "";
  const target = new URL(base);
  target.pathname = `/${name}`;
  target.search = "?schema=public";

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: target.toString() },
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  process.env.DATABASE_URL = target.toString();
  await seedFixture(target.toString());

  return async () => {
    if (!/^church_it_[0-9a-f]{8}$/.test(name)) return;
    const cleanup = new pg.Client({ connectionString: admin.toString() });
    await cleanup.connect();
    await cleanup.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await cleanup.end();
  };
}
