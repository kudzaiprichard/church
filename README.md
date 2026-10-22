# Church Management System

The member portal of Kingdom Manifest Ministries International: membership, connect groups,
events and attendance, giving, partnerships, sermons, devotions, prayer, baptism records and
messages, plus the church's public site. Requirements live in [`docs/SCOPE.md`](./docs/SCOPE.md);
the phased build, its status board and its git rules are in
[`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).

## Stack

| Concern      | Choice                                                          |
| ------------ | --------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Server Actions, TypeScript, `src/`)     |
| UI           | Tailwind CSS v4 + shadcn/ui (Radix), Recharts for charts        |
| Database     | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)                  |
| Email        | Resend (optional locally — mail goes to the server log)         |
| File storage | Cloudflare R2, S3-compatible (optional — uploads switch off)    |
| Scheduling   | Vercel Cron, one daily job (`vercel.json`)                      |
| Validation   | Zod + React Hook Form                                           |
| Tests        | Vitest — unit tests, and integration tests against Postgres     |

## Getting started

1. Install, and copy the environment template:

   ```bash
   npm install
   cp .env.example .env
   ```

   Every variable is explained in [`.env.example`](./.env.example) and validated at boot by
   `src/lib/env.ts`. Locally only `DATABASE_URL` is required. For a Postgres in Docker, run
   `docker compose up -d` and use
   `postgresql://church:church@localhost:5433/church?schema=public` (host port 5433, so it does
   not clash with a natively installed Postgres).

2. Create the schema and the church's starting content (settings, theme of the year, social
   links, connect groups, partnership projects). The seed is idempotent and creates no people:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

3. Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters), then run the
   app. On first start, with no Apostle in the database, that account is created; it must change
   its password at first sign-in. Remove the two variables afterwards.

   ```bash
   npm run dev
   ```

4. Sign in at http://localhost:3000/login and enrol everyone else from **Members**, or import
   the existing roll (below). Without `RESEND_API_KEY`, invitation links appear in the server log.

## Roles

Four offices, each with a fixed set of powers (`src/lib/auth/permissions.ts`, from SCOPE §4.2):

| Office  | Can                                                                                 |
| ------- | ----------------------------------------------------------------------------------- |
| Apostle | Everything: members and roles, groups, events, messages to all, finance, sermons, devotions, settings, audit log |
| Matron  | Enrol members; manage baptism candidates, classes and records                      |
| Elder   | See, confirm and export all church finance                                          |
| Member  | Their own profile, giving, pledges, attendance, notes and prayer; content sent to them or their groups |

**Group leader** is not an office but an assignment on a group: a leader sees and manages their
own group's members, attendance and messages, and nothing of any other group.

The rule every read follows: leadership sees what its office covers; everyone else sees only
their own data plus what is explicitly addressed to them. Each function in `src/lib/data/` scopes
its query through the Data Access Layer (`src/lib/auth/dal.ts`), and
`src/lib/data/scopes.it.test.ts` proves it for every office against a real database.

## Scripts

| Script                     | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `npm run dev`              | Development server                                              |
| `npm run build`            | Production build                                                |
| `npm run typecheck`        | Route types, then `tsc --noEmit`                                |
| `npm run lint`             | ESLint                                                          |
| `npm test`                 | Unit tests (rules, validation, money, dates, CSV, …)            |
| `npm run test:integration` | Scope tests: every data read, for every office, against Postgres |
| `npm run db:deploy`        | Apply pending migrations                                        |
| `npm run db:migrate`       | Create and apply a new migration (development)                  |
| `npm run db:seed`          | Starting content; safe to re-run, never overwrites edits        |
| `npm run db:studio`        | Prisma Studio                                                   |
| `npm run db:generate`      | Regenerate the Prisma client                                    |
| `npm run members:import`   | Import the existing member list from CSV (below)                |

`test:integration` creates a throwaway database named `church_it_<random>` on the server in
`TEST_DATABASE_URL` (or `DATABASE_URL`), migrates and seeds it, and drops it afterwards. CI runs
it against a Postgres service container.

## Importing the member list

```bash
npm run members:import -- --template members.csv      # a blank template with the columns
npm run members:import -- members.csv                 # dry run: check every row, change nothing
npm run members:import -- members.csv --commit --as apostle@example.org
npm run members:import -- members.csv --commit --as apostle@example.org --invite
```

Dates may be `2015-03-14` or `14/03/2015`; groups are names separated by `;`. Every member needs
a baptism date, exactly as enrolment in the portal does. The dry run writes
`members.csv.report.csv`, listing every line as ready or skipped and why. `--commit` enrols
all valid rows in one transaction, each with an audit entry; `--invite` then sends the
invitations 20 at a time. The report holds names and emails, so keep it with the spreadsheet.

## Theme

Royal blue and gold on white, with a deep navy for headings. All tokens live in
`src/app/globals.css` (light under `:root`, dark under `.dark`); change them there and every
component follows. Text, muted text, buttons, badges and form borders meet WCAG AA in both
modes. Check any change against that before committing it.

Type: **Plus Jakarta Sans** for headings, **Inter** for interface and body, **Cinzel** for the
wordmark, **Cormorant Garamond** for scripture, devotions and the baptism certificate, and **JetBrains Mono** for figures, via the
`numeric` utility, which forces tabular figures so money and counts line up in columns.
Light/dark follows the system setting by default; `ThemeToggle` switches it.

## Layout

```
prisma/schema.prisma       data model
prisma/seed.ts             starting content (seed-data.ts holds the values)
prisma/import-members.ts   member list import
src/app/                   routes: public site, (auth) sign-in screens, (app) the portal, api/cron
src/lib/auth/              sessions, permissions, the Data Access Layer, audit log
src/lib/data/              every scoped read, returning plain objects for pages
src/lib/<module>/          each module's pure rules and schemas, with their tests
src/lib/email.ts           all outbound mail goes through sendEmail()
src/lib/storage.ts         R2 uploads and deletes
src/lib/env.ts             validated server environment
src/test/integration/      the integration harness and its fixture
```

## Deploying

The Vercel build runs `prisma migrate deploy && next build` (`vercel-build`). Production needs
`DATABASE_URL` (pooled), `APP_URL` (https), `RESEND_API_KEY` and `EMAIL_FROM` on a verified
domain, `CRON_SECRET`, the five `R2_*` variables, and the bootstrap pair for the first sign-in
only. Work through [`docs/PRODUCTION.md`](./docs/PRODUCTION.md) before real members use it.
