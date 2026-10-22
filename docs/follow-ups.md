# Follow-ups

Everything still to do to take the portal live, across all phases. Tick items here as they
are done. Secrets never go in this file — it is in a public repository.

Phases 0–6 are done and merged to `main` (2026-10-22). What follows is **Phase 7 — Launch** in
`IMPLEMENTATION_PLAN.md`, plus everything else that is open: the outside services, the church
data, and the checks that need them. The step-by-step
production setup, with how to check each step, is in [`PRODUCTION.md`](./PRODUCTION.md). This list is the
same work, plus everything else that is open.

---

## 1. Security — do first

- [ ] **Upgrade Next.js 16.3.0 → 16.4.2** (or later 16.4.x). 16.3.0 has published critical
      advisories: remote code execution through image optimization (GHSA-2xp9-vwfh-vxw4,
      GHSA-2464-fhr4-w9xw), the Windows-hosted server (GHSA-p293-qw3h-jr36) and `next/og`
      (GHSA-vcvr-r3jv-pc5j), plus a Server Actions denial of service (GHSA-p3m5-59mp-jv5r),
      image-optimization SSRF and cache poisoning. 16.4.2 fixes all of them; 16.3.8 fixes all
      but the SVG image RCE and the Server Actions DoS. 16.4.2 was released 2026-10-15. Then run
      typecheck, lint, `npm test`, `npm run test:integration` and a build, and walk the app.
- [ ] Look over the rest of `npm audit` (mostly dev tooling: eslint-config-next, shadcn,
      prisma's config; also `sharp`, `undici`). None came from this work; fix with minor
      upgrades where available.
- [ ] Replace the local `RESEND_API_KEY` in `.env`: it is set but Resend rejects it as invalid.

## 2. Production database

- [ ] Create a managed Postgres (Neon, Supabase or similar) near the Vercel region; turn on
      point-in-time recovery and note the retention.
- [ ] Set `DATABASE_URL` in Vercel (Production) to the **pooled** connection string.
- [ ] First deploy runs `prisma migrate deploy` through that URL. If the pooler refuses
      migrations (advisory locks), use the provider's session-mode pooler, or add a
      `DIRECT_URL` for `prisma.config.ts` (a small code change).
- [ ] Seed once: `DATABASE_URL=<production> npm run db:seed` (creates only what is missing).

## 3. Vercel project

- [ ] Decide which Vercel project is production. Two are connected to the repo:
      **`church-yxd7`** deploys successfully; **`church`** has failed on every PR since #16,
      most likely for missing environment variables. Set it up properly or disconnect it.
- [ ] Set `APP_URL` to the portal's public **https** address (no trailing slash) and connect
      the custom domain with a valid certificate.
- [ ] Set every variable below in the production project (Settings → Environment Variables).

## 4. Email (Resend)

- [ ] Add the church's sending domain in Resend; verify its SPF and DKIM DNS records.
- [ ] Set `RESEND_API_KEY` (sending access) and `EMAIL_FROM`, e.g.
      `Kingdom Manifest <noreply@kmmi.church>`.
- [ ] Check: "Resend invitation" on a test member arrives (not in spam) and opens on `APP_URL`.

## 5. File storage (Cloudflare R2)

Steps are in `.env.example` under *File storage*.

- [ ] Create the bucket (e.g. `kmmi-media`); turn on public access (r2.dev or a custom
      domain) — that address is `R2_PUBLIC_URL`.
- [ ] CORS rule allowing `PUT` with `content-type` from the portal's origin (and
      `http://localhost:3000` for development).
- [ ] API token with Object Read & Write on that bucket.
- [ ] Set all five, locally and on Vercel: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
      `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`. A partial set stops the server.
- [ ] Then the storage checks moved from Phase 4: upload a sermon's audio and handout and a
      profile photo, play the audio, replace and remove files, delete a sermon and confirm its
      audio URL stops resolving.

## 6. Scheduled jobs

- [ ] Generate `CRON_SECRET` (`openssl rand -base64 32`, 16+ characters) and set it on Vercel.
      Without it no birthday, devotion, pledge or event reminders go out.
- [ ] After the first 06:00 Harare run (04:00 UTC), confirm a 200 in Vercel → Cron Jobs.
- [ ] Optional, on a paid Vercel plan: schedule `/api/cron/reminders` hourly in `vercel.json`
      for same-day event reminders. The Hobby plan allows only the daily job, which already
      sends tomorrow's event reminders.

## 7. First sign-in

- [ ] Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters) and
      `BOOTSTRAP_ADMIN_NAME` for the first deployment only.
- [ ] The Apostle signs in, replaces the password, and finds the bootstrap in the audit log.
- [ ] **Delete the three bootstrap variables from Vercel** and redeploy.

## 8. Church data (in the portal, by leadership)

- [ ] **Q7 — church details:** contact details, address, service times in **Settings**; the
      seed's placeholder copy disappears from the public site.
- [ ] **Q6 — project targets:** an Apostle sets each partnership project's real target on its
      page (**Partnerships → the project → edit**). Audited.
- [ ] **Member list:** Members → Import (Apostle or Matron). Download the template, fill it in,
      upload the `.xlsx` or a CSV, review the check with leadership, import, then **Send
      invitations** until none are left (needs email working, step 4).
- [ ] Assign each connect group's leader.

## 9. GitHub

- [ ] Branch protection: the repo is public, so the "main protection" ruleset is now free to
      create (spec in `.docs/BRANCH_PROTECTION.md`) — not created yet, by choice.
- [ ] CI runs on every non-draft PR to `main` (and now when a draft is marked ready); keep it
      green. It passed, integration tests included, on PR #21.

## 10. Launch checks (Phase 7's exit criteria)

- [ ] Deleting a sermon removes its audio from storage (step 5).
- [ ] The portal installs from the browser on an Android phone and an iPhone and opens on the
      dashboard.
- [ ] Production serves real data; the leadership walk-through — one session per office
      (Apostle, Matron, Elder, a group leader, a member) — completes without defects.
- [ ] Phase 7 marked ✅ in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)
      (`docs(plan): complete phase 7`), on the branch `feat/phase-7-launch`.

## 11. Local clean-up (this machine)

- [ ] Drop the test databases on the local Postgres when no longer wanted: `church_verify`,
      `church_verify_p2` … `church_verify_p5`, `church_perf`, `church_a11y`.
- [ ] The local `church` database's checksum for the Phase 3 finance migration differs from
      the committed one (it was edited before merge). If `prisma migrate` complains, recreate
      that local database.
