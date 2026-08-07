import "server-only";

import { z } from "zod";

/**
 * The environment, parsed once and typed.
 *
 * Nothing in this app reads `process.env` for configuration — it reads `env`
 * from here. That buys three things: a typo becomes a build-time type error
 * rather than `undefined` reaching a database driver, every variable is
 * documented in one place, and adding one means editing exactly one schema.
 *
 * `server-only` is load-bearing. These values include a database password and
 * an API key, and importing this module from a Client Component would be a
 * quiet way to ship them to the browser; the import makes that a build error
 * instead. Anything the browser genuinely needs must be a `NEXT_PUBLIC_`
 * variable read directly at its use site, never routed through here.
 */

const nodeEnv = z.enum(["development", "test", "production"]).default("development");

const schema = z
  .object({
    NODE_ENV: nodeEnv,

    /**
     * Postgres connection string. The protocol check is worth the two lines:
     * pointing this at something Prisma cannot speak produces an error much
     * further from the cause than "DATABASE_URL: must be a postgres:// URL".
     */
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      // Zod's default for a failed protocol check is a bare "Invalid URL",
      // which tells an operator nothing about which rule they broke.
      error: "must be a postgres:// or postgresql:// connection string",
    }),

    /**
     * Where this instance is reachable. Used to build the absolute links inside
     * invitation and password-reset emails, which is why it has no sensible
     * universal default in production — a link to localhost in someone's inbox
     * is a broken invitation.
     */
    APP_URL: z.url().default("http://localhost:3000"),

    /**
     * Mail. Optional here and required below only in production: a fresh clone
     * should start and let you sign in without anyone first registering a
     * Resend account, and `lib/email` falls back to writing the message to the
     * console when the key is absent.
     */
    RESEND_API_KEY: z.string().min(1).optional(),
    // Plain address or "Display Name <address@domain>" — Resend accepts both.
    EMAIL_FROM: z.string().min(3).default("Church <onboarding@resend.dev>"),

    /**
     * The first administrator, created on server start when the users table has
     * no admin in it. Optional, because once that account exists these have
     * done their job and should be removed from the environment — a running
     * system must not need them, and leaving a password lying about in the
     * environment is worse than the small convenience of keeping it.
     */
    BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).optional(),
    BOOTSTRAP_ADMIN_NAME: z.string().min(2).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    // Development can log mail to the console; production cannot, because a
    // password reset nobody receives is an account nobody can recover.
    if (!value.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "required in production — outbound email has no console fallback there",
      });
    }

    /**
     * Plain http to a real host in production means the session cookie, which
     * is set `secure`, never comes back — everyone appears signed out forever.
     *
     * Localhost is exempt on purpose, and not as a convenience: browsers treat
     * it as a trustworthy origin, so `secure` cookies do work there. Without
     * the exemption `npm run build` would fail on a developer's machine, since
     * `next build` runs with NODE_ENV=production against a local .env.
     */
    const host = new URL(value.APP_URL).hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";

    if (value.APP_URL.startsWith("http://") && !isLocal) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: `must be https:// for a non-local host (got http://${host}) — session cookies are set \`secure\` and will not travel over plain http`,
      });
    }
  });

/** Parsed shape, exported so `env` stays typed under the escape hatch below. */
type Env = z.infer<typeof schema>;

/**
 * Read straight from `process.env`.
 *
 * Safe precisely because this module is server-only: on the server that is the
 * real Node object, so there is no bundler substitution to work around and no
 * need to restate every key. Zod strips anything not in the schema, so
 * unrelated variables never end up on the exported object.
 */
function parseEnv(): Env {
  /**
   * `next build` imports every module to collect page data, including this one,
   * on machines that legitimately have no database password — CI runners and
   * Docker build stages. Without a way out, the build would demand production
   * secrets just to emit static HTML.
   *
   * This is deliberately not a general "skip validation in CI" switch: the
   * values it fabricates are obvious placeholders, and `register()` in
   * `instrumentation.ts` re-parses for real before the server takes a request,
   * so a genuinely misconfigured deploy still fails at boot rather than
   * limping along.
   */
  if (process.env.SKIP_ENV_VALIDATION) {
    return {
      NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) ?? "production",
      DATABASE_URL: "postgresql://build:build@localhost:5432/build",
      APP_URL: "http://localhost:3000",
      RESEND_API_KEY: undefined,
      EMAIL_FROM: "Church <onboarding@resend.dev>",
      BOOTSTRAP_ADMIN_EMAIL: undefined,
      BOOTSTRAP_ADMIN_PASSWORD: undefined,
      BOOTSTRAP_ADMIN_NAME: undefined,
    };
  }

  const result = schema.safeParse(process.env);
  if (result.success) return result.data;

  throw new Error(describe(result.error));
}

/**
 * Turn a zod error into something an operator can act on at 3am.
 *
 * The default is a wall of JSON with the received values embedded in it, which
 * is both hard to read and a way to print a database password into a log
 * aggregator. This prints the variable name and what is wrong with it, and
 * never the value.
 */
function describe(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const name = issue.path.join(".") || "(root)";
    const detail = issue.code === "invalid_type" && !process.env[name] ? "missing" : issue.message;
    return `  ${name}: ${detail}`;
  });

  return [
    `Invalid environment (${lines.length} problem${lines.length === 1 ? "" : "s"}):`,
    ...lines,
    "",
    "Copy .env.example to .env and fill in the values it documents.",
  ].join("\n");
}

export const env = parseEnv();

/** True when mail should be written to the console instead of sent. */
export const emailIsConfigured = Boolean(env.RESEND_API_KEY);
