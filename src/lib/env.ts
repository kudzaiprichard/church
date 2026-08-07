import { z } from "zod";

// Validated once at import time so a missing/typo'd variable fails loudly at
// boot rather than at the first request that needs it.
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  // Plain address or "Display Name <address@domain>" — both are valid for Resend.
  EMAIL_FROM: z.string().min(3),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // The first administrator, created on server start when the users table has
  // no admin in it. Optional, because once that account exists the variables
  // have done their job and should be removed from the environment — a running
  // system must not need them, and leaving a password lying about in the
  // environment is worse than the small convenience of keeping it.
  BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().min(2).optional(),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_URL: process.env.APP_URL,
  BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  BOOTSTRAP_ADMIN_NAME: process.env.BOOTSTRAP_ADMIN_NAME,
});
