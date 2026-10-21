# Church Management System

Membership, groups, giving and communication for the local church. Requirements live in
[`docs/SCOPE.md`](./docs/SCOPE.md); the phased build and its git rules are in
[`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).

## Stack

| Concern      | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 16 (App Router, TypeScript, `src/`)         |
| UI           | Tailwind CSS v4 + shadcn/ui (Radix, `nova` preset)  |
| Database     | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)      |
| Email        | Resend                                               |
| Validation   | Zod + React Hook Form                                |

## Getting started

1. Copy the environment template and fill it in:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — a reachable Postgres instance. For a local one in Docker, run
     `docker compose up -d` and use
     `postgresql://church:church@localhost:5433/church?schema=public` (host port 5433, so it
     does not clash with a natively installed Postgres).
   - `RESEND_API_KEY` / `EMAIL_FROM` — from https://resend.com. `onboarding@resend.dev` works for
     testing before a domain is verified.

2. Create the schema:

   ```bash
   npm run db:migrate
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

## Scripts

| Script                | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Development server                          |
| `npm run build`       | Production build (also typechecks)          |
| `npm run typecheck`   | `tsc --noEmit`                              |
| `npm run lint`        | ESLint                                      |
| `npm run db:migrate`  | Create and apply a migration                |
| `npm run db:push`     | Push the schema without a migration         |
| `npm run db:studio`   | Prisma Studio                               |
| `npm run db:generate` | Regenerate the Prisma client                |

## Theme

Deep plum on warm sand, with brass as the single accent. All tokens live in
`src/app/globals.css` — change them there and every component follows.

| Role         | Light                  | Dark                        |
| ------------ | ---------------------- | --------------------------- |
| Background   | sand `oklch(0.973 0.006 85)` | aubergine ink `oklch(0.185 0.014 350)` |
| Primary      | plum `oklch(0.36 0.088 348)` | lifted plum `oklch(0.72 0.105 345)` |
| Accent       | brass `oklch(0.918 0.036 80)` | `oklch(0.335 0.04 60)`   |

Neutrals are warm (hue ~80) rather than grey, so the background reads as paper rather than as an
off-white screen. Dark mode keeps the plum undertone in its neutrals instead of going to a neutral
black. Both modes clear WCAG AA on body text, muted text, buttons and badges.

Type has three roles:

- **Fraunces** — headings (`font-heading`, applied to `h1`–`h4` automatically)
- **Inter** — interface and body (`font-sans`)
- **JetBrains Mono** — figures, via the `numeric` utility, which also forces tabular figures so
  money and attendance counts line up in columns

Light/dark is handled by `next-themes`; `ThemeToggle` in `src/components/theme-toggle.tsx` is the
control, and it defaults to the system setting.

## Layout

```
prisma/schema.prisma     data model for all 12 modules
src/app/                 routes (App Router)
src/components/ui/       shadcn/ui components
src/lib/prisma.ts        Prisma client singleton
src/lib/email.ts         Resend wrapper — all outbound email goes through sendEmail()
src/lib/env.ts           validated server environment
src/generated/prisma/    generated Prisma client (gitignored)
```

## The one rule

From the spec, enforced at every module: **admins see all data; members see only their own data
plus data explicitly targeted at them.** Every query that reads member data must be scoped by the
caller's role and id.
