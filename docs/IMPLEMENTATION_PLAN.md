# KMMI Portal — Implementation Plan

| | |
|---|---|
| Document | Phased delivery plan for the KMMI Church Management System |
| Version | 1.0 — 21 October 2026 |
| Builds | [`docs/SCOPE.md`](./SCOPE.md) — **the scope is the specification; this plan is the schedule and the rules** |
| Git rules | `.docs/GIT_CONVENTIONS.md`, `.docs/FEATURE_BRANCH_WORKFLOW.md`, `.docs/BRANCH_PROTECTION.md`, `CONTRIBUTING.md` (local `.docs/` is gitignored; `CONTRIBUTING.md` is the published summary) |

> **Where scope and plan disagree, `SCOPE.md` wins** for *what* to build; this plan wins for
> *when* and *how it lands*. If a phase uncovers a scope change, update `SCOPE.md` in the same
> phase branch and say so in the PR.

---

## Status board

The single place to see where the build stands. Update it as described in
[§4.4 Status rules](#44-status-rules).

| Phase | Name | Branch | Status | PR | Started | Finished |
|:-:|---|---|:-:|:-:|---|---|
| — | Pre-flight | `docs/implementation-plan` | ✅ Done | #13, #14 | 2026-10-21 | 2026-10-21 |
| 0 | Foundation: roles, permissions, people, settings | `feat/phase-0-foundation` | ✅ Done | #15 | 2026-10-21 | 2026-10-21 |
| 1 | Groups & communication | `feat/phase-1-groups-messaging` | 🟡 In progress | #16 | 2026-10-22 | — |
| 2 | Events, attendance & prayer | `feat/phase-2-events-attendance-prayer` | ⬜ Not started | — | — | — |
| 3 | Finance | `feat/phase-3-finance` | ⬜ Not started | — | — | — |
| 4 | Sermons, notes & devotions | `feat/phase-4-content` | ⬜ Not started | — | — | — |
| 5 | Records, celebration & automation | `feat/phase-5-records-automation` | ⬜ Not started | — | — | — |
| 6 | Hardening & launch | `feat/phase-6-hardening` | ⬜ Not started | — | — | — |

**Legend:** ⬜ Not started · 🟡 In progress · ✅ Done · ⛔ Blocked (reason in the phase section)

---

## Contents

1. [Purpose and how to use this plan](#1-purpose-and-how-to-use-this-plan)
2. [Current system analysis](#2-current-system-analysis)
3. [Gap analysis](#3-gap-analysis)
4. [Phase execution rules](#4-phase-execution-rules)
5. [Pre-flight](#5-pre-flight)
6. [Phase 0 — Foundation](#phase-0--foundation)
7. [Phase 1 — Groups & communication](#phase-1--groups--communication)
8. [Phase 2 — Events, attendance & prayer](#phase-2--events-attendance--prayer)
9. [Phase 3 — Finance](#phase-3--finance)
10. [Phase 4 — Sermons, notes & devotions](#phase-4--sermons-notes--devotions)
11. [Phase 5 — Records, celebration & automation](#phase-5--records-celebration--automation)
12. [Phase 6 — Hardening & launch](#phase-6--hardening--launch)
13. [Appendix A — Command reference](#appendix-a--command-reference)
14. [Appendix B — PR template](#appendix-b--pr-template)

---

## 1. Purpose and how to use this plan

The scope (`SCOPE.md`) defines 23 features. This plan groups them into **seven phases (0–6)**.
Each phase:

- delivers a **complete, working, demoable** increment — nothing half-built reaches `main`;
- is built on **its own branch**, merged to `main` through **one pull request**;
- ends with the phase **marked Done**, the branch **merged**, and **merged branches pruned**.

Anyone picking up the work:

1. Read the [Status board](#status-board) to find the current phase.
2. Read that phase's section here, then every `SCOPE.md` section it references.
3. Follow [§4](#4-phase-execution-rules) exactly — the lifecycle, the commit format, the merge
   and the clean-up are not optional.

---

## 2. Current system analysis

Full detail in [`SCOPE.md` §3](./SCOPE.md#3-current-state-of-the-codebase). Summary:

### 2.1 Architecture (keep it)

| Layer | Implementation | Plan stance |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, Server Components + Server Actions | Keep. Read `AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code — this version has breaking changes (e.g. `proxy.ts` replaces Middleware). |
| Data | PostgreSQL 17 + Prisma 7 (`@prisma/adapter-pg`), client in `src/generated/prisma`, one migration `0_init` | Keep. Every schema change is a committed migration. |
| Security boundary | `src/lib/auth/dal.ts` (`requireSession`, `requireAdmin`, `ownerScope`) | Extend per [`SCOPE.md` §5.2](./SCOPE.md#52-the-data-access-layer-is-the-security-boundary). |
| Sessions | DB-stored, hashed, rolling 30 days; revoked on role change / deactivation | Keep unchanged. |
| Audit | Append-only `AuditLog`, written in the same transaction as the change | Keep; extend enum per [`SCOPE.md` §5.6](./SCOPE.md#56-audit-actions-to-add). |
| Feature pattern | `src/app/(app)/members/`: `page.tsx` + `actions.ts` + `form-state.ts` + client forms | Every new feature copies this ([`SCOPE.md` §5.3](./SCOPE.md#53-anatomy-of-a-feature-copy-srcappappmembers)). |
| Navigation | `src/app/(app)/_components/nav.ts`, unbuilt modules flagged `soon: true` | Each phase flips its items live; this is also how unfinished surfaces stay hidden. |
| Public site | `src/app/page.tsx`, `src/components/landing/*`, content hard-coded in `src/lib/church.ts` | Moves to DB in Phases 0, 1 and 4. |
| UI | Tailwind v4, shadcn/ui, KMMI blue-and-gold theme | Keep; add shadcn components as phases need them. |
| Email | Resend via `src/lib/email.ts` (logs instead of sending when unconfigured) | Keep. |
| Config | Zod-validated env in `src/lib/env.ts`, mirrored in `.env.example` | Every new variable goes in both. |
| CI | `.github/workflows/ci.yml`: **Detect changes** + **Lint & build (web)** (typecheck, lint, build). Web job skipped on draft PRs. | Keep; Phase 0 adds a test step. |
| Local DB | `docker compose up -d` → Postgres on host port 5433 | Use for all migration work. |

### 2.2 Built and working

Invite-only auth (login, lockout, invite/accept, forgot/reset/change password), first-admin
bootstrap, members admin (invite, role, activate, resend, reset), audit log page, account page
with devices, dashboard counts, app shell (rail, panel, command palette, read-only notification
bell), public landing page and plan-a-visit form, security headers/CSP, env validation, CI.

### 2.3 Repository and workflow state

| Item | State | Consequence for this plan |
|---|---|---|
| Brand redesign | `feat/kmmi-brand-redesign` landed on `main` in #13 during Pre-flight | Phase 0 starts from the rebranded `main`. |
| `docs/SCOPE.md`, `docs/IMPLEMENTATION_PLAN.md` | Committed in Pre-flight | `SCOPE.md` is the only requirements source in the repo. |
| `docs/Church Management System.pdf` | Deleted in Pre-flight (superseded by `SCOPE.md`) | — |
| Branch protection | **Not enforced** (private repo on Free plan) — rules are followed by convention | The maintainer merges their own PRs; the rules in §4 still apply in full. |
| Commit-message hook | Documented in `.docs/` but **not installed** (`.git/hooks` has none) | Format is enforced by review, not tooling. Follow §4.6 manually. |
| Tests | **None** | Phase 0 adds Vitest; every later phase adds tests for its logic. |
| Merge style so far | Squash merges (#1–#13) | Phases switch to merge commits — see §4.7. |
| GitHub Actions | **Budget exhausted** (Oct 2026): jobs are refused with "an Actions budget is preventing further use", so CI reports a failure without running anything | Until the budget is restored, the local CI fallback in §4.7 applies. |
| Vercel previews | PR preview deployments report "Deployment was blocked" (seen on #12 and #13) | Not a merge gate. Fix the Vercel project/team settings before Phase 6. |

---

## 3. Gap analysis

Each gap from the scope, the phase that closes it, and the scope section that specifies it.

| Area | Today | Gap | Phase | Scope |
|---|---|---|:-:|---|
| Roles | `ADMIN` / `MEMBER` | 4 offices + group leaders, permission map, DAL scopes | 0 | §4, §5.2, §9.1 |
| Member profile | name, email, phone | address, DOB, gender, baptism record, required baptism at enrolment, `/profile`, member detail | 0 | §9.3 |
| Settings | hard-coded `lib/church.ts` | `ChurchSettings`, `ThemeOfYear` + history, `SocialLink`, settings pages, landing reads DB, `/about` | 0 | §9.17–9.19 |
| Groups | draft model | reshape (`leaderId`, slug), seed 7 groups, pages, leader assignment | 0 (data) · 1 (UI) | §9.4 |
| Messages | draft model | send/inbox/sent, private reply threads, unread | 1 | §9.5 |
| Notifications | read-only bell | `notify()`, mark read, page, polling | 1 | §5.4, §9.13 |
| Events | draft model | reshape, calendar/list, CRUD, duplicate | 2 | §9.6 |
| Attendance | draft model | reshape (`markedBy`, unique), sheets, rates, overview | 2 | §9.7 |
| Prayer | draft model | group-scoped posting, pin/answer/remove | 2 | §9.8 |
| Finance | `TITHE`/`OFFERING` draft | 4 types, chema rule, review queue, charts, CSV | 3 | §9.9 |
| Partnerships | per-user draft | projects + pledges, progress, completion | 3 | §9.10 |
| File storage | none | `lib/storage.ts`, CSP update | 4 | §9.20 |
| Sermons | draft model | reshape, upload, search/filter, player | 4 | §9.11 |
| Sermon notes | draft model | private notes via `selfScope` | 4 | §9.12 |
| Devotions | none | model, scheduling, feed, teasers | 4 | §9.14 |
| Baptism | none | candidates, classes, certificates | 5 | §9.16 |
| Birthdays | none | `/birthdays`, dashboard cards, announcement | 5 | §9.15 |
| Scheduled jobs | none | Vercel Cron, reminders, purges | 5 | §9.21 |
| PWA | none | manifest, icons | 5 | §9.22 |
| Audit | 8 actions, no filters | new actions (added per phase), filters | 0–5 | §5.6, §9.23 |
| Tests | none | Vitest unit (Phase 0 on), scope integration tests | 0 → 6 | §10 |
| Launch | placeholders | real contacts, production env, data import | 6 | §10, §11 |

---

## 4. Phase execution rules

These rules are binding for every phase, for every person and every AI assistant working on the
repo. They put the repo's git rules (`.docs/`, `CONTRIBUTING.md`) into a phased form; where they
add something, it is marked **(phase rule)**.

### 4.1 Authorisation

- The repo default is *commit, push and merge only when the maintainer asks* (`GIT_CONVENTIONS`,
  `BRANCH_PROTECTION`).
- **(phase rule)** When the maintainer instructs "start Phase N" (or "continue Phase N"), that
  instruction authorises the **whole lifecycle of that phase only**: branch, commits, pushes,
  draft PR, status updates, merge to `main`, and the merged-branch clean-up in §4.8.
- It does **not** authorise: starting the next phase, force-pushing, rewriting history,
  `reset --hard`, deleting an unmerged branch, editing an applied migration, or changing GitHub
  settings. Each needs its own explicit request.

### 4.2 Sequencing

- Phases run **strictly in order**: 0 → 1 → 2 → 3 → 4 → 5 → 6.
- **Only one phase is In progress at a time.** Phase N+1 may not start until Phase N is ✅ Done
  and merged to `main`.
- A phase may not start while any **Entry criterion** in its section is unmet. If one cannot be
  met, the phase is ⛔ Blocked (see §4.4).

### 4.3 One phase, one branch

- **(phase rule)** Each phase is built on exactly one branch, named in the Status board:
  `feat/phase-<n>-<slug>`. Branched from an up-to-date `main`, never from another phase branch.
- The branch lives for the length of the phase only and is merged through **one PR**.
- This is the repo's trunk-based workflow with the phase as the slice: `main` stays releasable
  because the phase merges only when **everything** in it works. Inside the branch, unfinished
  screens stay hidden (nav items keep `soon: true` until their feature works).
- Keep `main` merged into the phase branch if `main` moves (`git merge origin/main`); never rebase
  a pushed phase branch.
- Small fixes to `main` that cannot wait (`fix/…`) still follow the normal
  `CONTRIBUTING.md` flow; the current phase branch then merges `main` in.

### 4.4 Status rules

The status of a phase is recorded in **two places that must always agree**: its row on the
[Status board](#status-board) and the `Status:` line at the top of its section.

| Transition | When | Who records it, how |
|---|---|---|
| ⬜ → 🟡 **In progress** | The first commit on the new phase branch | Commit `docs(plan): start phase <n>` — sets 🟡, branch, **Started** date (YYYY-MM-DD, Harare). Then push and open the **draft PR**; put the PR number on the board in the next commit. |
| 🟡 → ✅ **Done** | Every exit criterion is checked | Commit `docs(plan): complete phase <n>` — ticks every box in the phase section, sets ✅ and **Finished** date. This is the **last commit before merge**. |
| any → ⛔ **Blocked** | An entry criterion or decision is missing | Commit `docs(plan): block phase <n>` with a `Blocked:` line stating the reason and what unblocks it. Restore 🟡 when resolved. |

Rules:

- `main` therefore shows a phase as ✅ only after it is really merged. While a phase is in
  progress, the 🟡 status lives on the phase branch and is visible on GitHub through the open
  draft PR.
- The ✅ commit is made **before** the merge, so "merged" and "cleaned up" are not checkboxes:
  they are the **mandatory closing steps** (§4.7, §4.8) carried out immediately after it. A phase
  is closed only when it is merged and the clean-up has run. If CI goes red after the ✅ commit,
  fix it on the branch; if the fix reopens a deliverable, set the status back to 🟡.
- **Never** mark a phase ✅ with an unchecked deliverable or exit criterion. Descoping something
  requires moving it, in writing, to a later phase's deliverables (and to `SCOPE.md` if the
  scope itself changes).
- Tick deliverables (`- [x]`) as each one is committed, not in bulk at the end.

### 4.5 Phase lifecycle

```
 ┌─ START ────────────────────────────────────────────────────────────────────┐
 │ sync main → create phase branch → mark 🟡 → push → open DRAFT PR            │
 └────────────────────────────────────────────────────────────────────────────┘
 ┌─ BUILD (repeat) ───────────────────────────────────────────────────────────┐
 │ migration → lib/data + actions → pages → nav → tests → verify → commit     │
 │ push at least daily; tick deliverables as they land                        │
 └────────────────────────────────────────────────────────────────────────────┘
 ┌─ FINISH ───────────────────────────────────────────────────────────────────┐
 │ full verification → mark ✅ → push → PR ready for review → CI green          │
 │ → merge to main (merge commit) → delete branch                             │
 └────────────────────────────────────────────────────────────────────────────┘
 ┌─ CLEAN UP ─────────────────────────────────────────────────────────────────┐
 │ switch to main → pull → fetch --prune → delete merged branches only        │
 └────────────────────────────────────────────────────────────────────────────┘
```

**Start.**
1. `git switch main && git pull --ff-only origin main`
2. `git status` must be clean. No stray work carried into a phase.
3. Entry criteria checked (phase section).
4. `git switch -c feat/phase-<n>-<slug>`
5. Update the Status board + section to 🟡 → commit `docs(plan): start phase <n>`.
6. `git push -u origin feat/phase-<n>-<slug>`
7. `gh pr create --draft --base main --title "feat(phase-<n>): <name>" --body-file <PR body>`
   using [Appendix B](#appendix-b--pr-template). Record the PR number on the board (commit it with
   the next change).

**Build.** Work through the deliverables **in the order listed** (they are ordered so each
commit leaves the branch building). For every feature, follow the architecture rules in §4.9.
Commit per §4.6. Push at least once a working day.

**Finish.**
1. Run the full verification (§4.10) — all green.
2. Walk the phase's **Demo script** on a fresh local database (`npx prisma migrate reset`, then
   seed).
3. Tick every exit criterion; set ✅ and the Finished date → commit `docs(plan): complete phase <n>`.
4. `git push`
5. `gh pr ready` → `gh pr checks --watch` until **Detect changes** and **Lint & build (web)** are
   green. (CI's web job is skipped while a PR is a draft — this step is what fires it.)
6. Merge per §4.7.

**Clean up.** Per §4.8.

### 4.6 Commit rules (from `.docs/GIT_CONVENTIONS.md`)

Exact message shape:

```
type(scope): short summary of what was done

- path/to/file.ts: specific change in this file
- path/to/other.tsx: specific change in this file
```

- **A blank line separates the summary from the bullets** (as in `CONTRIBUTING.md` and the
  repo's history). Without it git treats the whole message as the subject line.
- `type`: `feat`, `fix`, `refactor`, `chore`, `style`, `docs`, `test`.
- `scope`: the feature/domain — `auth`, `members`, `groups`, `messages`, `events`, `attendance`,
  `prayer`, `finance`, `partnerships`, `sermons`, `notes`, `devotions`, `baptism`, `birthdays`,
  `settings`, `notifications`, `data`, `ui`, `plan`, `ci`.
- **Exactly one bullet per file in the commit.** No "update files", no "misc".
- **Group by feature or purpose.** One logical change per commit; never one commit for a whole
  phase, never one commit per file unless the change really is one file.
- A migration is committed **with** the `schema.prisma` change that produced it.
- Generated files (`src/generated/`, `.next/`) are never committed (already gitignored).
- **No attribution trailers.** The repo forbids `Co-Authored-By: Claude …`, "Generated with Claude
  Code" or any Claude/Anthropic attribution in commits or PR descriptions. Commits are authored
  only by the repo's configured git user.
- Never `--no-verify`, never amend a pushed commit.

Typical commit sequence for one feature inside a phase:

```
feat(data): reshape event and attendance models for scoped attendance
feat(events): add scoped event queries and actions
feat(events): add calendar, list and event detail pages
feat(attendance): add per-event attendance sheet
test(attendance): cover leader marking scope
feat(ui): enable events and attendance in the navigation
```

### 4.7 Merge rules

- **(phase rule)** Phase PRs merge with a **merge commit**, not squash:
  ```bash
  gh pr merge <PR> --merge --delete-branch \
    --subject "feat(phase-<n>): <phase name> (#<PR>)" \
    --body "Completes Phase <n> of docs/IMPLEMENTATION_PLAN.md. See PR for the full change list."
  ```
  Why: a phase holds dozens of well-formed, feature-grouped commits. Squashing would collapse
  them into one commit whose message cannot meet the one-bullet-per-file rule, and it would lose
  the per-feature history `git bisect` needs. A merge commit keeps them and also makes the
  branch provably merged (`git merge-base --is-ancestor`), which the clean-up depends on.
- Pre-flight and small `fix/…`/`docs/…` PRs keep the existing `--squash --delete-branch` style.
  The squash message must itself follow §4.6 (one bullet per file, no attribution trailers) —
  pass it with `--subject` and `--body`, never accept GitHub's generated one.
- **Local CI fallback.** If CI *cannot run* — Actions budget exhausted, GitHub outage — as
  opposed to running and failing, the maintainer may approve merging on local checks. Then:
  run §4.10 on the exact PR head commit, post a PR comment naming the commit, the commands and
  the reason CI did not run, and only then merge. A check that ran and **failed** is never
  bypassed this way.
- Merge only when: CI green, all exit criteria ticked, status ✅ committed, branch up to date
  with `main` (merge `origin/main` in and re-run CI if not).
- Branch protection is currently not enforced (§2.3); the maintainer merges their own phase
  PRs. If protection is switched on later, use the admin bypass described in
  `.docs/BRANCH_PROTECTION.md` — never weaken the ruleset to get a merge through.
- **Never** push directly to `main`, force-push, or delete `main`.

### 4.8 Clean-up and pruning rules

After **every** merge, before anything else:

```bash
git switch main
git pull --ff-only origin main
git fetch --prune origin              # drops refs to remote branches already deleted
```

Then delete **merged** branches only — locally and on the remote:

```bash
# Local branches fully contained in main (true for phase merges)
git branch --merged main --format='%(refname:short)' \
  | grep -vE '^(main)$' \
  | xargs -r git branch -d

# Local branches from earlier squash-merged PRs: delete only if the PR is MERGED
# and the local tip is exactly what was merged (so no unpushed work is lost)
gh pr list --state merged --limit 200 --json headRefName,headRefOid \
  --jq '.[] | "\(.headRefName) \(.headRefOid)"' |
while read -r branch sha; do
  [ "$branch" = "main" ] && continue
  if [ "$(git rev-parse --verify --quiet "refs/heads/$branch")" = "$sha" ]; then
    git branch -D "$branch"
  fi
done

# Remote branches whose PR is merged but which were not auto-deleted
gh pr list --state merged --limit 200 --json headRefName --jq '.[].headRefName' |
while read -r branch; do
  [ "$branch" = "main" ] && continue
  git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1 \
    && git push origin --delete "$branch"
done

git fetch --prune origin
git branch -a                          # confirm: main + any branch with OPEN work only
```

Rules:

- **Never delete**: `main`; the branch currently checked out; any branch with an **open** PR;
  any branch whose tip is not on `main` and has no merged PR (that is unmerged work — ask the
  maintainer).
- `git branch -d` (lowercase) is the default. `-D` is allowed **only** in the guarded loop above,
  where the PR is merged and the tip matches the merged commit.
- Clean-up is part of the phase. A phase is not finished until `git branch -a` shows no merged
  branches left.

### 4.9 Architecture rules every phase must follow

From [`SCOPE.md` §5](./SCOPE.md#5-architecture-and-conventions). A PR that breaks any of these
is not mergeable.

1. **Access is decided in the DAL.** Every page calls `requireSession` / `requirePermission` /
   `requireGroupLeader`; **every Server Action calls it again as its first line.** Nav hiding is
   presentation only.
2. **Reads go through `src/lib/data/<feature>.ts`** with the caller's `SessionUser` as the first
   argument and the correct scope (`ownerScope`, `selfScope`, `groupContentScope`,
   `memberScope`). Sermon notes use **`selfScope` only**.
3. **Every input is parsed with Zod on the server**; validation errors are returned as form
   state, never thrown.
4. **Privileged writes are transactional with their audit entry** (`recordAuditIn(tx, …)`).
5. **DTOs to the client** — no Prisma rows; `Decimal` → string, `Date` → ISO string.
6. **Derived numbers are computed** (raised, paid, rates, counts, overdue) — never stored.
7. **Dates use `Africa/Harare`**; date-only fields are `@db.Date`.
8. **New private routes** are added to the shared list in `src/lib/routes.ts` (created in Phase 0),
   which feeds both `src/proxy.ts` and the no-store headers in `next.config.ts`.
9. **New env variables** go in `src/lib/env.ts` **and** `.env.example`.
10. **Migrations**: created with `npx prisma migrate dev --name phase<n>_<what>`; never edit a
    migration once it is on `main`; destructive changes (enum swaps, dropping draft tables) are
    hand-edited SQL, explained in the PR. `npm run vercel-build` applies them on deploy.
11. **Nav items stay `soon: true` until the feature works end to end**, then go live in the same
    phase.
12. Works at **360 px** wide and in **dark mode**; has empty, loading and error states.

### 4.10 Verification gate (before ✅)

```bash
docker compose up -d                   # local Postgres on 5433
npx prisma migrate reset --force       # fresh DB, all migrations from 0_init
npm run db:seed                        # from Phase 0 on
npm run typecheck
npm run lint
npm test                               # from Phase 0 on
npm run build
npx prisma migrate status              # "Database schema is up to date"
```

Plus: the phase's **Demo script**, done by hand, signed in as each role it names.

### 4.11 When things go wrong

| Situation | Rule |
|---|---|
| CI red on the PR | Fix on the phase branch with a normal commit. Never merge red. Never disable a check. |
| CI did not run (budget, outage) | Ask the maintainer; with approval use the local CI fallback in §4.7. |
| `main` moved during the phase | `git merge origin/main` into the phase branch, resolve, re-verify, push. |
| A migration already merged is wrong | Add a **new** corrective migration. Never edit the old one. |
| An exit criterion cannot be met in this phase | Agree with the maintainer, move it in writing to a later phase (both sections), then finish. |
| A scope question blocks progress | Mark ⛔ Blocked with the question; reference `SCOPE.md` §11. |
| Work must be abandoned | Close the PR unmerged, set status back to ⬜ on `main` via a `docs/` PR, and keep the branch until the maintainer says to delete it. |

---

## 5. Pre-flight

**Status:** ✅ Done

Housekeeping so Phase 0 starts from a clean, current `main`. Not a phase; uses the normal
squash-merge flow.

- [x] Land `feat/kmmi-brand-redesign` (2 commits ahead of `main`): open its PR, CI green,
      `gh pr merge --squash --delete-branch` — **requires the maintainer's go-ahead**, as it is
      existing unreviewed work. The squash message carries no attribution trailers.
      *Merged as #13 (`5622985`). CI could not run (Actions budget exhausted); merged on the
      local CI fallback with maintainer approval — typecheck, lint and build green, recorded on
      the PR.*
- [x] Run the clean-up in §4.8 after that merge.
- [x] Update the local `.docs/FEATURE_BRANCH_WORKFLOW.md` reference from
      `.docs/IMPLEMENTATION_PLAN.md` to `docs/IMPLEMENTATION_PLAN.md` (local only, not committed).
- [x] Branch `docs/implementation-plan` from the updated `main`; commit the addition of
      `docs/SCOPE.md` and `docs/IMPLEMENTATION_PLAN.md`, the deletion of
      `docs/Church Management System.pdf`, and the `README.md` and `prisma/schema.prisma`
      references that now point at `SCOPE.md`, with Pre-flight marked ✅
      (`docs(plan): replace requirement PDFs with consolidated scope and implementation plan`,
      one bullet per file); PR and squash-merge, then the §4.8 clean-up as the closing step. From
      here on, `SCOPE.md` is the only requirements source in the repo.

> Leadership answers to `SCOPE.md` §11 are **not** a Pre-flight item: each question is an entry
> criterion of the phase that needs it.

---

## Phase 0 — Foundation

**Status:** ✅ Done
**Branch:** `feat/phase-0-foundation`
**Goal:** The access model, member records and church settings everything else depends on.
**Scope:** §4, §5.2–5.6, §6 (People, Groups data, Baptismal record, Settings), §6.1, §9.1, §9.2
(theme card only), §9.3, §9.17, §9.18, §9.19 (settings-driven parts), §9.23 (guard).
**Depends on:** Pre-flight.

### Entry criteria
- [x] Pre-flight ✅.
- [x] Real or confirmed-placeholder church contact details available for seeding (Q7 may be
      answered later; placeholders allowed). *Placeholders from `src/lib/church.ts` are seeded.*

### Deliverables (in commit order)

**Tooling**
- [x] Add Vitest (`vitest`, `vite-tsconfig-paths`), `npm test` script, `vitest.config.ts`.
- [x] Add a **Test** step to `.github/workflows/ci.yml` after Lint (the job name
      `Lint & build (web)` stays unchanged so the documented check name still matches).
- [x] `src/lib/routes.ts`: `PROTECTED_PREFIXES`; `src/proxy.ts` and `next.config.ts` read from it.

**Roles & access**
- [x] Migration `phase0_roles`: `Role { APOSTLE MATRON ELDER MEMBER }`, existing `ADMIN` →
      `APOSTLE` (hand-edited SQL).
- [x] `src/lib/auth/permissions.ts` (`PERMISSIONS`, `Permission`, `can`) per §4.2.
- [x] `dal.ts`: `requirePermission`, `requireGroupLeader`, `ledGroupIds`, `memberGroupIds`,
      `ownerScope(user, permission, field)`, `selfScope`, `groupContentScope`, `memberScope`;
      remove `requireAdmin` after every caller is moved.
- [x] Replace every `role === "ADMIN"` in UI and actions with `can()`
      (dashboard, members, landing nav, audit).
- [x] Bootstrap creates an `APOSTLE`; last active Apostle cannot be demoted/deactivated.
- [x] Login error wording per §9.1.
- [x] `nav.ts`: `permission` / `leaderOnly` on items; `railFor(user, ledGroupIds)`; full map from
      §8 with unbuilt items `soon: true`.
- [x] Unit tests: permission map, `can`, each scope helper for each role.

**People**
- [x] Migration `phase0_people`: `User` gains `address`, `dateOfBirth`, `gender`;
      `BaptismalRecord`; `Group` reshaped (`slug`, `audience`, `leaderId`; drop `isLeader`);
      new `AuditAction` values used in this phase.
- [x] `src/lib/data/members.ts` (directory, detail, own profile — scoped by `memberScope`).
- [x] `/members/new` enrolment form (required baptism, groups multi-select) + `enrollMember`
      (transaction: user + baptismal record + memberships + audit, then invite email reusing the
      existing invite path and copy-link fallback).
- [x] `/members` directory: search, group/role/active filters, pagination.
- [x] `/members/[id]` detail (Profile, Groups, Baptism tabs live; Attendance/Giving/Pledges tabs
      appear in their phases) and `/members/[id]/edit` + `updateMember`.
- [x] `/profile` + `updateOwnProfile` (phone, address, DOB, gender).
- [x] Unit test: enrolment schema rejects missing/future baptism date with the exact message.

**Settings & public site**
- [x] Migration `phase0_settings`: `ChurchSettings`, `ThemeOfYear`, `SocialLink`.
- [x] `prisma/seed.ts` + `db:seed` script: settings, themes 2023–2026, socials, 7 groups.
- [x] `src/lib/settings.ts`: cached getters tagged `church-settings`.
- [x] `/settings`, `/settings/theme` (with history table), `/settings/social` + actions + audit.
- [x] Landing page, footer and dashboard theme card read from settings; groups section reads
      `Group` (leader name or "Vacant"); `/about` page; "Tithes & Offerings" copy fixed.
- [x] `src/lib/church.ts` reduced to the static timetable/services. *Also kept, as static copy: the anchor verse, bulletin blurb, portal feature cards and `churchIdentity` (name for pages that must render without a database). `devotion` and `recentSermons` stay until Phase 4, whose deliverables already move them to the database.*
- [x] Nav: Members, Profile, Settings, Audit live.

**Plan**
- [x] `docs(plan): complete phase 0`.

### Exit criteria
- [x] A `MEMBER` calling any members/settings action directly is refused and nothing is written.
      *Replayed the enrolment action's form POST as a Member: redirected, no user and no audit
      row written. Every action's first line is its permission guard.*
- [x] Matron can enrol but cannot edit members, change roles or open settings.
      *Walked: `/members` and `/members/new` open; `/members/[id]/edit`, `/settings` and `/audit`
      redirect to the dashboard with no record content in the response; no office controls.*
- [x] Enrolment without a baptism date fails on the server with the scope's exact message.
      *Form has `noValidate`, so the browser does not block it; unit-tested in
      `src/lib/members/schema.test.ts` too.*
- [x] Changing the theme shows on the landing page on the next load, with "Last updated by …".
      *`updateTag("church-settings")`, not `revalidateTag`, so the next load is fresh.*
- [x] Zero remaining references to `"ADMIN"` or `requireAdmin` (`grep` clean).
- [x] §4.10 verification green locally; demo script walked.
      *Fresh database: Prisma refuses `migrate reset` from an AI agent without the user's
      consent, so a throwaway `church_verify` database was dropped, recreated and migrated from
      `0_init` with `migrate deploy` (equivalent result), then seeded twice (idempotent).
      Typecheck, lint, 73 tests, build (also with `SKIP_ENV_VALIDATION=1` and no database) green.
      Demo walked on a production build against that database as Apostle, Matron and Member.
      Not verified visually: the 360 px pass (the browser window could not be resized); the
      layouts use the existing responsive patterns, and Phase 6 has the formal 360 px pass.*

### Demo script
Sign in as the bootstrapped Apostle → set Minister Winnie to `MATRON` and Elder Mangezi to
`ELDER` → as Matron, enrol a member (try without baptism date first) → accept the invite from
the log → as the member, edit own profile and confirm `/members` is unreachable → as Apostle,
change the theme and check the landing page.

---

## Phase 1 — Groups & communication

**Status:** 🟡 In progress
**Branch:** `feat/phase-1-groups-messaging`
**Goal:** Groups with leaders, a targeted inbox with private replies, and working notifications.
**Scope:** §5.4, §6 (Messages, Notification), §9.4, §9.5, §9.13 (excluding cron sources).
**Depends on:** Phase 0.

### Entry criteria
- [x] Phase 0 ✅ and merged.
- [x] Q5 (members seeing fellow members' phone numbers) answered, or default "No" accepted.
      *Default "No" accepted by the maintainer on 2026-10-22: fellow members see names and
      avatars only.*

### Deliverables
- [x] Migration `phase1_messaging`: `MessageReply` thread fields, `Message.groupId` `SetNull`,
      `NotificationType` additions, `Notification.dedupeKey`.
- [x] `src/lib/notifications.ts` — `notify()` (fan-out, dedupe, optional post-commit email).
- [x] `src/lib/data/groups.ts`; `/groups`, `/groups/[id]` (Members + Announcements tabs; Events
      and Prayer tabs arrive in Phase 2) + `createGroup`, `updateGroup`, `deleteGroup`,
      `setLeader`, `addMembers`, `removeMember` with audit.
- [ ] `src/lib/data/messages.ts`; `/messages`, `/messages/sent`, `/messages/new`,
      `/messages/[id]`; `sendMessage` (audience guard, send-time fan-out), `reply`, `markRead`,
      `markAllRead`.
- [ ] Notification bell: mark one / all read, 60 s refresh; `/notifications` page with type filter.
- [ ] Dashboard: unread messages, "My group" card for leaders.
- [ ] Tests: audience guard per role; reply-thread visibility; recipients resolved at send time.
- [ ] Nav: Connect groups, Messages, Notifications live.
- [ ] `docs(plan): complete phase 1`.

### Exit criteria
- [ ] Member A cannot see member B's reply to the same group message (test + manual).
- [ ] A leader cannot target a group they do not lead by tampering with the form.
- [ ] Changing a group's leader changes who can post to it on the next request.
- [ ] §4.10 verification green locally; demo script walked.

### Demo script
Apostle assigns Mai Madzana to Kingdom Total Women → she messages her group → two members reply
→ each sees only their own thread; she sees both → bell shows unread counts and clears on read.

---

## Phase 2 — Events, attendance & prayer

**Status:** ⬜ Not started
**Branch:** `feat/phase-2-events-attendance-prayer`
**Goal:** The church calendar, attendance per event with rates, and group prayer.
**Scope:** §6 (Event, AttendanceRecord, PrayerRequest), §9.6, §9.7, §9.8.
**Depends on:** Phase 1 (groups, `notify()`).

### Entry criteria
- [ ] Phase 1 ✅ and merged.
- [ ] Q9 (leaders creating events) answered, or default "No" accepted.

### Deliverables
- [ ] Migration `phase2_events`: `Event.groupId` + `reminderSentAt` (drop `EventScope`,
      `EventAudience`); `AttendanceRecord` with `markedById`, `@@unique([userId, eventId])`,
      `PRESENT | ABSENT` (drop `serviceName`, `EXCUSED`); `PrayerRequest` index.
- [ ] `src/lib/data/events.ts`; `/events` (calendar + list views, month param), `/events/new`,
      `/events/[id]`, `/events/[id]/edit`; `createEvent`, `updateEvent`, `deleteEvent`,
      `duplicateEvent` with notifications and audit.
- [ ] `src/lib/data/attendance.ts`; `/events/[id]/attendance` sheet + `markAttendance`
      (all-or-nothing scope check); `/attendance` overview per role; attendance rate helper.
- [ ] `src/lib/data/prayer.ts`; `/prayer?group=` + `postRequest`, `togglePin`, `markAnswered`,
      `removeRequest`.
- [ ] Group detail Events and Prayer tabs; member detail Attendance tab; dashboard upcoming
      events and attendance rate.
- [ ] Add shadcn `calendar`/`checkbox`/`switch` as needed.
- [ ] Tests: event visibility by group; attendance marking scope; rate (incl. "—" with no
      records); prayer visibility.
- [ ] Nav: Events, Attendance, Prayer requests live.
- [ ] `docs(plan): complete phase 2`.

### Exit criteria
- [ ] A Youth Alive member sees no Kingdom Total Women event or prayer request anywhere.
- [ ] A leader submitting an outside `userId` in the attendance payload writes nothing.
- [ ] §4.10 verification green locally; demo script walked.

### Demo script
Apostle creates a Sunday service (all church) and a Youth Alive meeting → Elder Mangezi marks
Youth Alive attendance for both, Mai Zaranyika marks Sunday School for the service → member
sees own history and rate → member posts a prayer request, leader pins it.

---

## Phase 3 — Finance

**Status:** ⬜ Not started
**Branch:** `feat/phase-3-finance`
**Goal:** Chema, welfare, tithe and partnership giving, with review, projects, pledges, charts and
CSV.
**Scope:** §6 (Finance), §9.9, §9.10, §9.2 (finance cards).
**Depends on:** Phase 1 (`notify()`); Phase 0 (permissions).

### Entry criteria
- [ ] Phase 2 ✅ and merged.
- [ ] **Q1** (Elder's finance reach) and **Q2** (confirmation of self-logged payments) answered or
      defaults accepted in writing.
- [ ] Q6 project targets supplied, or placeholder targets agreed for seeding.

### Deliverables
- [ ] Migration `phase3_finance`: `ContributionType`/`ContributionStatus`, reshaped
      `Contribution`, `PartnershipProject`, `Pledge`; drop draft `Partnership`,
      `PartnershipPayment`; raw SQL partial unique index (one chema per month) and CHECK
      constraints.
- [ ] Seed the five partnership projects.
- [ ] `src/lib/finance/chema.ts` (`expectedChema`, compliance) and `src/lib/finance/money.ts`;
      `<Money/>` component.
- [ ] `src/lib/data/finance.ts`, `partnerships.ts`.
- [ ] `/finance`: Log Payment dialog, totals, 12-month chema grid, history.
- [ ] `/finance/review`: pending queue, confirm / reject (reason) / bulk confirm; notify member.
- [ ] Record-for-member and reversing entries for officers, with audit.
- [ ] `/finance/church`: filters, KPIs, Recharts bar (type × group) and line (monthly), table.
- [ ] `/finance/chema`: compliance by month, leaders limited to their groups.
- [ ] `/finance/export` CSV route (`src/lib/csv.ts`, formula-injection safe, audited).
- [ ] `/partnerships`, `/partnerships/[id]`: progress, contributor table, complete-project dialog.
- [ ] `/finance/pledges`: create, progress, auto-fulfil, cancel, derived Overdue.
- [ ] Member detail Giving + Pledges tabs; dashboard finance cards per role.
- [ ] Tests: `expectedChema` for all 12 months; duplicate chema rejected; totals count CONFIRMED
      only; CSV escaping; leader sees no non-chema amounts.
- [ ] Nav: My giving, Church finance, Chema compliance, Payment review, Partnerships live.
- [ ] `docs(plan): complete phase 3`.

### Exit criteria
- [ ] Chart totals equal table totals for the same filters.
- [ ] No stored `amountRaised`/`amountPaid` columns exist.
- [ ] A confirmed contribution cannot be edited or deleted by any action.
- [ ] §4.10 verification green locally; demo script walked.

### Demo script
Member logs January chema ($5) and a tithe → Elder confirms one, rejects one → member is notified
and sees statuses → Apostle creates a project, member pledges and contributes → progress bars move
→ Elder exports CSV and opens it in a spreadsheet.

---

## Phase 4 — Sermons, notes & devotions

**Status:** ⬜ Not started
**Branch:** `feat/phase-4-content`
**Goal:** The church's spiritual content, with private notes and scheduled devotions.
**Scope:** §6 (Sermon, SermonNote, Devotion), §9.11, §9.12, §9.14, §9.19 (teasers), §9.20.
**Depends on:** Phase 0.

### Entry criteria
- [ ] Phase 3 ✅ and merged.
- [ ] Storage provider chosen (Vercel Blob or Cloudflare R2) and credentials available.

### Deliverables
- [ ] Storage env vars in `env.ts` + `.env.example`; `src/lib/storage.ts`; client-direct upload
      for audio; CSP `media-src`/`img-src`/`connect-src` updated in `next.config.ts`.
- [ ] Avatar upload on `/profile` (uses storage).
- [ ] Migration `phase4_content`: reshaped `Sermon`, `SermonNote`, `Devotion`.
- [ ] `src/lib/data/sermons.ts`; `/sermons` (search + series/preacher/tag filters), `/sermons/new`,
      `/sermons/[id]`, `/sermons/[id]/edit`; card, audio player; `createSermon`, `updateSermon`,
      `deleteSermon` (removes storage objects, audit).
- [ ] `src/lib/data/notes.ts` using **`selfScope` only**; note editor with autosave on sermon
      detail; `/notes` index; `saveNote`, `deleteNote`.
- [ ] `src/lib/data/devotions.ts`; `/devotions` (feed + Draft/Scheduled tabs for Apostles),
      `/devotions/new`, `/devotions/[id]`, `/devotions/[id]/edit`; derived status.
- [ ] Landing: latest 3 sermons and blurred devotion teaser from DB; dashboard devotion + latest
      sermon cards.
- [ ] Tests: an Apostle session cannot read another user's note through any data function;
      scheduled devotion hidden before its Harare date; YouTube URL validation.
- [ ] Nav: Sermons, Devotions, My sermon notes live.
- [ ] `docs(plan): complete phase 4`.

### Exit criteria
- [ ] No code path returns another user's note (test passes for Apostle).
- [ ] Deleting a sermon removes its audio from storage.
- [ ] §4.10 verification green locally; demo script walked.

### Demo script
Apostle uploads a sermon with audio and a YouTube link, schedules a devotion for tomorrow and
publishes one for today → member searches by scripture, plays audio, writes a note → Apostle
cannot see the note anywhere → tomorrow's devotion is invisible to the member and the public
teaser.

---

## Phase 5 — Records, celebration & automation

**Status:** ⬜ Not started
**Branch:** `feat/phase-5-records-automation`
**Goal:** Baptism administration, birthdays, scheduled reminders and the installable app.
**Scope:** §6 (Baptism candidates/classes), §9.13 (cron sources), §9.15, §9.16, §9.21, §9.22,
§9.23 (filters).
**Depends on:** Phases 1–4.

### Entry criteria
- [ ] Phase 4 ✅ and merged.
- [ ] **Q3** (public birthdays) and **Q4** (baptism candidates) answered or defaults accepted.

### Deliverables
- [ ] Migration `phase5_baptism`: `BaptismCandidate`, `BaptismalClass`,
      `BaptismalClassEnrollment`; certificate fields on `BaptismalRecord`.
- [ ] `src/lib/data/baptism.ts`; `/baptism` records (filters), `/baptism/[id]` + Issue certificate
      (numbering, audit, notify), `/baptism/[id]/certificate` printable page,
      `/baptism/candidates` (+ "Enrol as member" pre-filling `/members/new`),
      `/baptism/classes`, `/baptism/classes/[id]`.
- [ ] Profile shows own baptism and certificate status.
- [ ] `src/lib/dates.ts` birthday helpers (Harare, 29 Feb rule); `src/lib/data/birthdays.ts`;
      `/birthdays` (Today / Week / Month / All by month, search, group filter); dashboard banner
      and week card; `announceBirthdays` action.
- [ ] `CRON_SECRET` in env; `vercel.json` crons; `/api/cron/daily` (birthdays, devotion of the
      day, pledge reminders, notification and session/token purges) and `/api/cron/reminders`
      (event reminders); all idempotent via `dedupeKey`.
- [ ] PWA: manifest, icons (192, 512, maskable), linked from root layout; no caching of private
      routes.
- [ ] Audit log filters (action, actor, date range).
- [ ] Tests: next-birthday calculation incl. 29 Feb and year boundary; cron handlers reject
      missing/wrong secret; running a cron twice creates no duplicate notifications.
- [ ] Nav: Birthdays, Baptism records live — **no `soon: true` items remain**.
- [ ] `docs(plan): complete phase 5`.

### Exit criteria
- [ ] Other members never see a birth year or age.
- [ ] Matron can do everything in Baptism and nothing in finance or settings.
- [ ] Every feature in `SCOPE.md` §9 is reachable from the navigation.
- [ ] §4.10 verification green locally; demo script walked.

### Demo script
Matron creates a class with two candidates, completes it, enrols one candidate as a member, issues
the certificate and prints it → member sees certificate status → set a member's birthday to today
and run `/api/cron/daily` twice: one notification → install the PWA on a phone.

---

## Phase 6 — Hardening & launch

**Status:** ⬜ Not started
**Branch:** `feat/phase-6-hardening`
**Goal:** Prove the access rule holds everywhere, polish, and go live with real data.
**Scope:** §10 (Testing, Definition of done), §11 (remaining decisions).
**Depends on:** Phases 0–5.

### Entry criteria
- [ ] Phase 5 ✅ and merged.
- [ ] Q6 and Q7 answered (real project targets and real church contact details).
- [ ] Existing member list available for import (spreadsheet), with baptism dates.

### Deliverables
- [ ] Integration test harness against Docker Postgres (separate test database, migrated and
      seeded per run); CI service container for it.
- [ ] Scope integration tests: for **every** `src/lib/data/*` function, a Member, a leader of
      another group, the Matron, the Elder and an Apostle each receive exactly the rows
      `SCOPE.md` §4.3 allows.
- [ ] Accessibility pass (keyboard, focus, labels, contrast in both themes) and 360 px pass on
      every route.
- [ ] Performance pass: indexes confirmed against slow queries; dashboard queries batched.
- [ ] Real church details in settings seed; placeholder copy removed.
- [ ] Member import script (`prisma/import-members.ts`) with dry-run mode, validation report and
      audit entries; invites sent in batches.
- [ ] Production checklist: env vars, pooled `DATABASE_URL`, `APP_URL`, Resend domain verified,
      storage, `CRON_SECRET`, bootstrap variables removed after first sign-in.
- [ ] `README.md` updated (stack, scripts incl. `db:seed`/`test`, roles, links to `SCOPE.md` and
      this plan).
- [ ] Decision recorded on enforcing branch protection (public repo or GitHub Pro), per
      `.docs/BRANCH_PROTECTION.md`.
- [ ] `docs(plan): complete phase 6`.

### Exit criteria
- [ ] All scope integration tests pass in CI.
- [ ] Production deployment serves real data; the leadership walk-through (one session per role)
      completes without defects.
- [ ] Every earlier row on the Status board is ✅.

### Demo script
Leadership walk-through on production: each office signs in on a phone and completes its
everyday tasks (enrol, message, take attendance, confirm giving, post a devotion, issue a
certificate).

---

## Appendix A — Command reference

```bash
# ── Start a phase ───────────────────────────────────────────────
git switch main && git pull --ff-only origin main && git status
git switch -c feat/phase-<n>-<slug>
#   edit Status board + section → 🟡, Started date
git add docs/IMPLEMENTATION_PLAN.md
git commit -m "docs(plan): start phase <n>" -m "- docs/IMPLEMENTATION_PLAN.md: mark phase <n> in progress"
git push -u origin feat/phase-<n>-<slug>
gh pr create --draft --base main --title "feat(phase-<n>): <name>" --body-file pr-body.md

# ── During the phase ────────────────────────────────────────────
npx prisma migrate dev --name phase<n>_<what>
git fetch origin && git merge origin/main     # only if main moved
git push

# ── Finish ──────────────────────────────────────────────────────
#   §4.10 verification, demo script, tick boxes, ✅ + Finished date
git commit -m "docs(plan): complete phase <n>" -m "- docs/IMPLEMENTATION_PLAN.md: mark phase <n> done"
git push
gh pr ready
gh pr checks --watch
gh pr merge <PR> --merge --delete-branch --subject "feat(phase-<n>): <name> (#<PR>)"

# ── Clean up ────────────────────────────────────────────────────
#   §4.8 in full
```

## Appendix B — PR template

```markdown
## Phase <n> — <name>

Implements Phase <n> of `docs/IMPLEMENTATION_PLAN.md` against `docs/SCOPE.md` §<sections>.

### Delivered
- <feature>: <one line>
- …

### Migrations
- `phase<n>_<what>` — <additive | destructive: why, and what the SQL does>

### New environment variables
- <NAME> — <purpose> (added to `src/lib/env.ts` and `.env.example`) | none

### Verification
- [ ] `prisma migrate reset` + `db:seed` on a fresh database
- [ ] `npm run typecheck` · `npm run lint` · `npm test` · `npm run build`
- [ ] Demo script walked as: <roles>
- [ ] Exit criteria all ticked in the plan

### Scope changes
- none | <what changed in SCOPE.md and why>
```

No Claude/Anthropic attribution in the PR body or title (`.docs/GIT_CONVENTIONS.md`).
