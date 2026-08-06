import { z } from "zod";

// Validated once at import time so a missing/typo'd variable fails loudly at
// boot rather than at the first request that needs it.
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  // Plain address or "Display Name <address@domain>" — both are valid for Resend.
  EMAIL_FROM: z.string().min(3),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_URL: process.env.APP_URL,
});
