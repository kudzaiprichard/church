# Production checklist

What has to be true before real members use the portal. Work through it in order; each step
says how to check it. The plan's Phase 6 deliverable is ticked once every box here is.

Variables are set in the Vercel project (**Settings → Environment Variables**, Production
scope) and never committed. `src/lib/env.ts` validates them at boot. A missing or malformed
one stops the server with a list of what is wrong, so a failed deployment log is the first place
to look.

## 1. Database

- [ ] A managed Postgres (Neon, Supabase or similar) in a region near the Vercel functions.
- [ ] `DATABASE_URL` set to its **pooled** connection string. Serverless functions open many
      short connections, and a direct URL runs out of them under load.
- [ ] Migrations: `vercel-build` runs `prisma migrate deploy` with the same `DATABASE_URL`.
      Some transaction-mode poolers refuse what migrations need (advisory locks). If the first
      deploy fails at that step, either use the provider's session-mode pooler, or add a
      `DIRECT_URL` for `prisma.config.ts` to migrate through. That is a small code change.
- [ ] Seeded once: `DATABASE_URL=<production> npm run db:seed`. It creates only what is missing.
- [ ] Backups: point-in-time recovery switched on at the provider, and the retention noted
      here: ______.

## 2. Address

- [ ] `APP_URL` is the portal's public **https** address, with no trailing slash. Invitation
      and reset links are built from it. Over plain http the secure session cookie is never
      sent back, which looks like everyone being signed out at random.
- [ ] The custom domain is connected in Vercel and serves a valid certificate.

## 3. Email (Resend)

- [ ] The sending domain is added in Resend and its DNS records (SPF, DKIM) verified.
- [ ] `RESEND_API_KEY` is a key with sending access, and `EMAIL_FROM` is an address on that
      domain, e.g. `Kingdom Manifest <noreply@kmmi.church>`.
- [ ] Check: "Resend invitation" on a test member arrives in an inbox, not in spam, and its link
      opens on `APP_URL`.

## 4. File storage (Cloudflare R2)

The steps are in `.env.example` under *File storage*. In short: a bucket, public access (r2.dev
or a custom domain), a CORS rule allowing `PUT` from `APP_URL`, and an Object Read & Write
token scoped to the bucket.

- [ ] All five set: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
      `R2_PUBLIC_URL`. A partial set stops the server.
- [ ] Check: upload a sermon's audio and handout and a profile photo; play the audio; replace
      and remove a file; delete a sermon and confirm its audio URL stops resolving.

## 5. Scheduled jobs

- [ ] `CRON_SECRET` set (16+ characters, `openssl rand -base64 32`). Vercel Cron sends it to
      `/api/cron/daily` at 04:00 UTC (06:00 in Harare), per `vercel.json`. Without it the job
      refuses every call, so no birthday, devotion, pledge or event reminders go out.
- [ ] Check: after the first 06:00, **Settings → Cron Jobs** in Vercel shows a 200 for the run.

## 6. First sign-in

- [ ] `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters) and
      `BOOTSTRAP_ADMIN_NAME` set for the first deployment only.
- [ ] The Apostle signs in, replaces the password as required, and confirms the audit log shows
      the bootstrap.
- [ ] **The three bootstrap variables are deleted from Vercel** and the project redeployed.

## 7. Church data

- [ ] Real contact details, service times and address in **Settings** (SCOPE Q7). The seed's
      placeholders are gone from the public site.
- [ ] Real partnership project targets (SCOPE Q6).
- [ ] The member list imported: a dry run with `npm run members:import -- members.csv`, its
      report reviewed with leadership, then `--commit --as <apostle email>`, and `--invite`
      once email works (step 3).
- [ ] Group leaders assigned on each group.

## 8. Final checks

- [ ] The portal installs from the browser on an Android phone and an iPhone and opens on the
      dashboard.
- [ ] The leadership walk-through, one session per office (Apostle, Matron, Elder, a group
      leader, a member), signed off.
- [ ] The Vercel deployment log shows no env warnings at boot.
