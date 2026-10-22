# KMMI Portal — System Scope

**Kingdom Manifest Ministries International · Church Management System**

| | |
|---|---|
| Document | Implementation scope (source of truth for building the system) |
| Version | 1.0 — 21 October 2026 |
| Supersedes | Nothing; consolidates the two requirement documents below |
| Sources | Consolidated from two earlier requirement PDFs — the generic 12-module *Church Management System* brief and the KMMI *Church Management System Requirements* v1.0 (Aug 2026). **This document replaces both**; the PDFs are no longer kept in the repo and must not be used as a reference. Requirement changes are made here. |
| Codebase | `church/` — Next.js 16, Prisma 7, PostgreSQL |

> **How to read this document.** Sections 1–4 explain *what* we are building and *for whom*.
> Section 5 is the rulebook every feature follows. Sections 6–8 define the data model and
> the file layout. Section 9 is the feature-by-feature specification — each feature lists its
> routes, data, actions, rules and acceptance criteria, so it can be built and reviewed in
> isolation. Section 10 is the build order. Section 11 lists decisions that still need
> leadership sign-off; the defaults written into this document apply until they are changed.

---

## Contents

1. [Summary](#1-summary)
2. [Scope](#2-scope)
3. [Current state of the codebase](#3-current-state-of-the-codebase)
4. [Roles and permissions](#4-roles-and-permissions)
5. [Architecture and conventions](#5-architecture-and-conventions)
6. [Target data model](#6-target-data-model)
7. [Target file structure](#7-target-file-structure)
8. [Navigation map](#8-navigation-map)
9. [Feature specifications](#9-feature-specifications)
10. [Delivery plan](#10-delivery-plan)
11. [Open decisions](#11-open-decisions)
12. [Glossary](#12-glossary)

---

## 1. Summary

The KMMI Portal is a private, invite-only church management system for Kingdom Manifest
Ministries International, with a public website in front of it. It replaces paper registers,
WhatsApp announcements and hand-kept giving books with one place where:

- **Leadership** (the Apostles, the Matron, the Elder and the group leaders) enrol members, run
  the seven connect groups, publish events, sermons and daily devotions, take attendance and
  oversee church finance (chema, welfare, tithe, partnership projects and pledges).
- **Members** see their own records — giving, attendance, pledges, baptism status — receive
  announcements targeted at them, post prayer requests in their group, read devotions, watch
  and take private notes on sermons, and celebrate one another's birthdays.

Its single most important rule, from both requirement documents:

> **Leadership sees what its office entitles it to. A member sees only their own data plus
> content explicitly targeted at them.** This is enforced on the server, in the query, for
> every module — never only by hiding a button.

The system works on phones and desktops, and is installable as a Progressive Web App.

---

## 2. Scope

### 2.1 In scope (version 1)

| Area | Features |
|---|---|
| Identity | Invite-only accounts, sign-in, password reset, sessions, five-role access model, audit log |
| People | Member enrolment (baptized only), profiles, member directory, connect groups and leaders |
| Communication | Targeted messages/announcements, private replies, in-app notifications, email for key notices |
| Church life | Events (calendar + list), attendance per event, prayer requests per group |
| Finance | Chema, welfare, tithe, partnership projects, pledges, confirmation of logged payments, charts, CSV export |
| Spiritual content | Sermons (audio + YouTube), personal sermon notes, daily devotions with scheduling |
| Records | Baptismal records, certificates, baptismal classes and candidates |
| Celebration | Birthdays (today / week / month / all) |
| Settings | Church information, Theme of the Year with history, social media links |
| Public site | Landing page, About page, devotion teaser, latest sermons, theme, socials, plan-a-visit form |
| Platform | PWA manifest, scheduled reminders, file storage for sermon audio and profile photos |

### 2.2 Out of scope (version 1)

- Online payment processing (EcoCash, card, PayPal). Payments are *recorded*, not *taken*.
- SMS or WhatsApp delivery of notifications. Email + in-app only.
- Recurring-event rules (e.g. "every Sunday"). Events are created individually; a **Duplicate**
  action covers the repetitive case.
- Public self-registration. There is none, by requirement.
- Multi-branch / multi-church tenancy.
- Native mobile apps (the PWA covers installation).
- Live-streaming. Sermons link to YouTube.
- Offerings. **Removed** by the KMMI document and replaced by Welfare.

### 2.3 Decisions taken while consolidating the two sources

| Topic | Generic brief | KMMI document | **Adopted** |
|---|---|---|---|
| Roles | Admin / Member | Apostle / Matron / Elder / Group Leader / Member | KMMI. "Group leader" is derived from leading a group, not a stored role (§4.1) |
| Giving types | Tithe, Offering | Chema, Welfare, Tithe, Partnership | KMMI |
| Partnerships | Per-member promises | Church projects + member pledges | KMMI: `PartnershipProject` + `Pledge` |
| Tech stack | — | React + Vite + Supabase + RLS | **Keep the existing Next.js + Prisma + Postgres stack.** The Data Access Layer (§5.2) does the job RLS was specified for. The KMMI document's stack section is treated as descriptive, not binding. |
| Devotions, birthdays, baptism, theme, socials | — | Specified | Included |
| Member ↔ group | — | One `groupId` per user | Many-to-many membership (a member may serve in Praise & Worship *and* belong to Kingdom Real Men). One-group-only is a subset. |

---

## 3. Current state of the codebase

Built and working (do not rebuild — extend):

| Area | Location |
|---|---|
| Sign-in, lockout, sessions in DB, rolling 30-day expiry | `src/app/(auth)/`, `src/lib/auth/session.ts` |
| Invite, accept invite, forgot/reset/change password | `src/app/(auth)/`, `src/lib/auth/auth-tokens.ts`, `emails.ts` |
| First administrator bootstrap | `src/lib/auth/bootstrap.ts`, `src/instrumentation.ts` |
| Data Access Layer (`requireSession`, `requireAdmin`, `ownerScope`) | `src/lib/auth/dal.ts` |
| Audit log (append-only, transactional) + page | `src/lib/auth/audit.ts`, `src/app/(app)/audit/` |
| Members admin (invite, role, activate, resend, reset) | `src/app/(app)/members/` |
| Account page (devices, sessions) | `src/app/(app)/account/` |
| Dashboard (counts only) | `src/app/(app)/dashboard/` |
| App shell: icon rail, context panel, command palette, notification bell (read-only) | `src/app/(app)/_components/` |
| Public landing page (static content) and plan-a-visit form | `src/app/page.tsx`, `src/components/landing/`, `src/lib/church.ts`, `src/app/actions.ts` |
| Security headers, CSP, no-store on private routes | `next.config.ts` |
| Env validation | `src/lib/env.ts` |
| CI (lint + build) | `.github/workflows/ci.yml` |

Present only as draft Prisma models (no pages, no actions): groups, messages, events,
prayer, attendance, contributions, partnerships, sermons, notes, notifications. Several of
these drafts change shape in §6.

---

## 4. Roles and permissions

### 4.1 The role model

Two independent things decide what a person can do:

1. **Office** — stored in `User.role`:

   | Role | Holders (2026) | Summary |
   |---|---|---|
   | `APOSTLE` | Apostle Takura James Makamba, Apostle Edna Makamba | Everything. Both have identical access. |
   | `MATRON` | Minister Winnie | Enrolment and baptismal records/classes |
   | `ELDER` | Elder Mangezi | Church-wide finance oversight and export |
   | `MEMBER` | Everyone else | Own data plus targeted content |

2. **Group leadership** — stored as `Group.leaderId`. Anyone (of any office) who is the leader
   of a group gets **leader powers over that group only**. Today:

   | Group | Leader |
   |---|---|
   | Youth Alive | Elder Mangezi |
   | Young Adults | Minister Winnie |
   | Sunday School | Mai Zaranyika |
   | Kingdom Total Women | Mai Madzana |
   | Kingdom Real Men | Baba Mashinge |
   | Hosting | *Vacant* |
   | Praise and Worship | *Vacant* |

   A "Group Leader" in the KMMI document is therefore a `MEMBER` who leads a group. This avoids
   a role that cannot say *which* group, and gives the Matron and the Elder their group duties
   without special-casing them.

**Migration:** existing `ADMIN` rows become `APOSTLE`. The enum `Role { ADMIN MEMBER }` becomes
`Role { APOSTLE MATRON ELDER MEMBER }` (hand-edited migration: add values, update rows, drop old
value).

### 4.2 Permission catalogue

Permissions live in one file, `src/lib/auth/permissions.ts`. Office-based permissions are a
static map; group-scoped powers are checked against `Group.leaderId`.

```ts
export const PERMISSIONS = {
  "members.viewAll":        ["APOSTLE"],
  "members.enroll":         ["APOSTLE", "MATRON"],
  "members.edit":           ["APOSTLE"],
  "members.setRole":        ["APOSTLE"],
  "members.setActive":      ["APOSTLE"],
  "groups.manage":          ["APOSTLE"],
  "messages.sendAll":       ["APOSTLE"],
  "events.manage":          ["APOSTLE"],
  "attendance.viewAll":     ["APOSTLE"],
  "prayer.viewAll":         ["APOSTLE"],
  "finance.viewAll":        ["APOSTLE", "ELDER"],
  "finance.confirm":        ["APOSTLE", "ELDER"],
  "finance.export":         ["APOSTLE", "ELDER"],
  "projects.manage":        ["APOSTLE"],
  "sermons.manage":         ["APOSTLE"],
  "devotions.manage":       ["APOSTLE"],
  "baptism.manage":         ["APOSTLE", "MATRON"],
  "birthdays.announce":     ["APOSTLE"],
  "settings.manage":        ["APOSTLE"],   // church info, theme, socials
  "audit.view":             ["APOSTLE"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
export function can(user: SessionUser, permission: Permission): boolean;
```

Group-scoped powers (leader of group *G*, or `APOSTLE`):

- view *G*'s member list with contact details and attendance rate
- send messages to *G* or to an individual member of *G*
- mark attendance for *G*'s members
- pin / unpin / remove prayer requests in *G*
- view chema compliance (paid / unpaid) for *G*'s members — **not** amounts of tithe, welfare or partnership

### 4.3 Permission matrix

`●` full · `◐` scoped (own group / own record) · `—` none

| Capability | Apostle | Matron | Elder | Group leader | Member |
|---|:-:|:-:|:-:|:-:|:-:|
| Enrol member (baptized only) | ● | ● | — | — | — |
| Edit any member profile | ● | — | — | — | — |
| Edit own personal info | ● | ● | ● | ● | ● |
| Change role / activate / deactivate | ● | — | — | — | — |
| Member directory (contacts) | ● | ◐ | ◐ | ◐ | — |
| See own group's member names | ● | ● | ● | ● | ● |
| Create / edit / delete groups, assign leaders | ● | — | — | — | — |
| Message all church | ● | — | — | — | — |
| Message a group / its members | ● | ◐ | ◐ | ◐ | — |
| Reply to a message received | ● | ● | ● | ● | ● |
| Create / edit / delete events | ● | — | — | — | — |
| View events | ● | ◐ | ◐ | ◐ | ◐ |
| Mark attendance | ● | ◐ | ◐ | ◐ | — |
| View attendance of others | ● | ◐ | ◐ | ◐ | — |
| View own attendance | ● | ● | ● | ● | ● |
| Post prayer request in own group | ● | ● | ● | ● | ● |
| Pin / remove prayer requests | ● | ◐ | ◐ | ◐ | own only (remove) |
| See prayer requests across all groups | ● | — | — | — | — |
| Log own payment | ● | ● | ● | ● | ● |
| View own giving & pledges | ● | ● | ● | ● | ● |
| Group chema compliance | ● | ◐ | ● | ◐ | — |
| Church-wide finance overview | ● | — | ● | — | — |
| Confirm / reject logged payments | ● | — | ● | — | — |
| Export finance CSV | ● | — | ● | — | — |
| Create / complete partnership projects | ● | — | — | — | — |
| Contributor breakdown per project | ● | — | ● | — | — |
| Upload / edit / delete sermons | ● | — | — | — | — |
| View and search sermons | ● | ● | ● | ● | ● |
| Private sermon notes (own only; nobody else, ever) | ● | ● | ● | ● | ● |
| Post / schedule devotions | ● | — | — | — | — |
| Read devotions | ● | ● | ● | ● | ● |
| Baptismal records, certificates, classes, candidates | ● | ● | — | — | — |
| View own baptism / certificate status | ● | ● | ● | ● | ● |
| Birthday calendar (names, day + month, group) | ● | ● | ● | ● | ● |
| Send birthday announcement to all church | ● | — | — | — | — |
| Theme of the Year, socials, church info | ● | — | — | — | — |
| Audit log | ● | — | — | — | — |

---

## 5. Architecture and conventions

### 5.1 Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript, Server Components + Server Actions |
| Data | PostgreSQL 17, Prisma 7 (`@prisma/adapter-pg`), client generated to `src/generated/prisma` |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide-react icons, sonner toasts |
| Forms | React Hook Form + Zod (validated again on the server) |
| Charts | Recharts via shadcn `chart` component (**to add**) |
| Email | Resend through `src/lib/email.ts` (`sendEmail`) |
| File storage | Vercel Blob or Cloudflare R2 behind `src/lib/storage.ts` (**to add**, §9.20) |
| Scheduling | Vercel Cron → `src/app/api/cron/*` route handlers (**to add**, §9.21) |
| Hosting | Vercel (app) + managed Postgres (Neon / Supabase Postgres / Vercel Postgres) |
| Timezone | `Africa/Harare` for every "today", "this month" and reminder calculation |
| Currency | USD, `Decimal(12,2)` |

> **Read before writing Next.js code:** `church/AGENTS.md` — this Next version has breaking
> changes (e.g. Middleware is now `proxy.ts`). Consult `node_modules/next/dist/docs/`.

### 5.2 The Data Access Layer is the security boundary

All authorization is decided in `src/lib/auth/dal.ts` and the helpers it exports. Not in
`proxy.ts`, not in a layout, not by hiding nav items.

Exports after this scope is implemented:

| Function | Use |
|---|---|
| `getSession()` | Cached per request. Returns the `SessionUser` DTO or `null`. |
| `requireSession()` | Any signed-in user; redirects to `/login` or `/change-password`. |
| `requirePermission(p)` | Office-based gate. Redirects to `/dashboard` on failure (no "forbidden" disclosure). Replaces `requireAdmin()`. |
| `requireGroupLeader(groupId)` | Passes for the group's leader or an `APOSTLE`. |
| `ledGroupIds(user)` | Cached list of group ids this user leads. |
| `memberGroupIds(user)` | Cached list of group ids this user belongs to. |
| `ownerScope(user, field?)` | Rows owned by the user; **everything** for holders of the relevant `*.viewAll` permission. Takes the permission as an argument so it no longer means "admin". |
| `selfScope(user, field?)` | Rows owned by the user, **for everyone including Apostles**. Use for sermon notes. |
| `groupContentScope(user)` | Content for all church (`groupId: null`) or for groups the user belongs to; everything for Apostles. Use for events, prayer requests, group messages. |
| `memberScope(user)` | Which `User` rows may be listed: all (Apostle), members of led groups (leaders), self (member). |

> ⚠️ **Sermon notes must never use `ownerScope`.** It returns `{}` for Apostles, and notes are
> private from everyone. Use `selfScope`.

`SessionUser` gains `role` values from §4.1; `isLeader` is **not** cached on the session (a
leadership change must bite on the next request) — call `ledGroupIds`.

### 5.3 Anatomy of a feature (copy `src/app/(app)/members/`)

```
src/app/(app)/<feature>/
  page.tsx            Server Component. First line: requireSession()/requirePermission().
                      Reads through src/lib/data/<feature>.ts only.
  actions.ts          "use server". Every exported function:
                        1. guard (requirePermission / requireGroupLeader / requireSession)
                        2. parse FormData with a Zod schema
                        3. re-check ownership of any id it was given
                        4. write in prisma.$transaction, with recordAuditIn() for privileged acts
                        5. notify() if someone must be told
                        6. revalidatePath()/revalidateTag()
                        7. return a FormState — never throw for validation errors
  form-state.ts       FormState type + idle value (a "use server" module may only export async fns)
  *-form.tsx          "use client" forms using useActionState
  [id]/page.tsx       Single record: load, then ownsOrAdmin / scope check, else notFound()
src/lib/data/<feature>.ts
                      "server-only". Scoped read functions taking SessionUser as first arg.
                      The access rule for the feature is written here, once.
```

Rules:

- **Every Server Action re-checks access.** It is a public POST endpoint.
- **Never pass Prisma rows to Client Components.** Map to plain DTOs; `Decimal` → string,
  `Date` → ISO string.
- **Money:** store `Decimal`, compute in `Prisma.Decimal`, format with
  `Intl.NumberFormat("en-ZW", { style: "currency", currency: "USD" })` and the `numeric`
  utility class.
- **Dates without a time** (birthdays, baptism date, paid date, due date) use `@db.Date`.
- **Lists** paginate at 50 rows with `?page=`; searches use `?q=`. Keep filters in the URL so
  they survive reloads and can be shared.
- **Derived numbers are computed, never stored:** amount raised, amount paid, member count,
  attendance rate, overdue status. (The KMMI table lists `amountRaised`, `memberCount`; do not
  add them as columns — they would drift.)
- **Deletion:** hard delete for content (sermons, devotions, events, prayer requests) with an
  audit entry; **never** delete financial rows — reject or reverse them instead.
- **New private route prefix** → add it to `PROTECTED_PREFIXES` in `src/proxy.ts` **and** to the
  no-store sources in `next.config.ts`. Before adding the second module, move both to one shared
  constant in `src/lib/routes.ts` so they cannot drift.
- **Commits:** Conventional Commits, one feature branch and PR per module (see `.docs/`).

### 5.4 Notifications pipeline

One helper, `src/lib/notifications.ts`:

```ts
notify(tx, {
  userIds: string[],            // already resolved recipients
  type: NotificationType,
  title: string,
  body?: string,
  linkUrl?: string,             // internal path only, e.g. "/events/abc"
  dedupeKey?: string,           // e.g. "event-reminder:abc:user123" — makes cron idempotent
  email?: boolean,              // also send via sendEmail(), after commit, best effort
})
```

Fan-out uses `createMany({ skipDuplicates: true })`. Emails are sent after the transaction
commits and never fail the action.

### 5.5 Settings and caching

Church info, the current theme and social links are read through
`src/lib/settings.ts` using `unstable_cache` tagged `"church-settings"`. Saving settings calls
`revalidateTag("church-settings")`, so the public site and portal show the change on the next
page load — this is how "updates live" is implemented. `src/lib/church.ts` keeps only content
that is genuinely static (service times, the weekly timetable) and seeds the rest.

### 5.6 Audit actions to add

```
MEMBER_ENROLLED  MEMBER_UPDATED  GROUP_CREATED  GROUP_UPDATED  GROUP_DELETED  GROUP_LEADER_CHANGED
CONTRIBUTION_CONFIRMED  CONTRIBUTION_REJECTED  CONTRIBUTION_RECORDED_FOR_MEMBER
PROJECT_CREATED  PROJECT_UPDATED  PROJECT_COMPLETED  PLEDGE_CANCELLED  FINANCE_EXPORTED
BAPTISM_RECORD_UPDATED  CERTIFICATE_ISSUED
SERMON_DELETED  DEVOTION_DELETED  EVENT_DELETED  PRAYER_REQUEST_REMOVED
THEME_UPDATED  SETTINGS_UPDATED
```

---

## 6. Target data model

Replaces the draft modules in `prisma/schema.prisma`. Auth models (`Session`, `AuthToken`,
`AuditLog`) are unchanged apart from the enum additions in §5.6. Relation back-fields on `User`
are omitted below for brevity but must be added.

```prisma
// ─── People ─────────────────────────────────────────────────────────────────

enum Role   { APOSTLE MATRON ELDER MEMBER }
enum Gender { MALE FEMALE }

model User {
  // …existing auth fields unchanged (email, passwordHash, lockout, mustChangePassword…)
  firstName   String
  lastName    String
  phone       String?
  address     String?
  dateOfBirth DateTime? @db.Date
  gender      Gender?
  role        Role      @default(MEMBER)
  avatarUrl   String?
  joinedAt    DateTime  @default(now())
  isActive    Boolean   @default(true)

  baptismalRecord BaptismalRecord?
  // …relations
  @@index([role])
  @@index([isActive])
}

// ─── Groups ─────────────────────────────────────────────────────────────────

model Group {
  id          String   @id @default(cuid())
  slug        String   @unique            // "youth-alive"
  name        String   @unique
  audience    String?                     // "Ages 13–25"
  description String?
  leaderId    String?                     // null = Vacant
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  leader   User?             @relation("GroupLeader", fields: [leaderId], references: [id], onDelete: SetNull)
  members  GroupMembership[]
  messages Message[]
  events   Event[]
  prayers  PrayerRequest[]

  @@index([leaderId])
}

model GroupMembership {
  id       String   @id @default(cuid())
  userId   String
  groupId  String
  joinedAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([userId, groupId])
  @@index([groupId])
}
// (the draft `isLeader` column is removed; leadership is Group.leaderId)

// ─── Messages ───────────────────────────────────────────────────────────────

enum MessageAudience { ALL GROUP INDIVIDUAL }

model Message {
  id       String          @id @default(cuid())
  senderId String
  subject  String
  body     String
  audience MessageAudience
  groupId  String?                         // when audience = GROUP
  sentAt   DateTime        @default(now())

  sender     User               @relation("MessageSender", fields: [senderId], references: [id])
  group      Group?             @relation(fields: [groupId], references: [id], onDelete: SetNull)
  recipients MessageRecipient[]
  replies    MessageReply[]

  @@index([senderId, sentAt])
}

model MessageRecipient {          // fan-out: one row per recipient at send time
  id        String    @id @default(cuid())
  messageId String
  userId    String
  readAt    DateTime?

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId])
  @@index([userId, readAt])
}

/// A reply belongs to a private thread between the original sender and ONE
/// recipient (`threadUserId`). Other recipients of a group message never see it.
model MessageReply {
  id           String   @id @default(cuid())
  messageId    String
  threadUserId String                       // the member whose conversation this is
  authorId     String                       // the member or the original sender
  body         String
  createdAt    DateTime @default(now())
  readAt       DateTime?                    // read by the other party

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  author  User    @relation("ReplyAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  thread  User    @relation("ReplyThread", fields: [threadUserId], references: [id], onDelete: Cascade)

  @@index([messageId, threadUserId, createdAt])
}

// ─── Events & attendance ────────────────────────────────────────────────────

model Event {
  id             String    @id @default(cuid())
  title          String
  description    String?
  location       String?
  startsAt       DateTime
  endsAt         DateTime?
  groupId        String?                    // null = All Church
  createdById    String
  reminderSentAt DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  group      Group?             @relation(fields: [groupId], references: [id], onDelete: SetNull)
  createdBy  User               @relation("EventCreator", fields: [createdById], references: [id])
  attendance AttendanceRecord[]

  @@index([startsAt])
  @@index([groupId, startsAt])
}
// (draft EventScope and EventAudience are removed)

enum AttendanceStatus { PRESENT ABSENT }

model AttendanceRecord {
  id         String           @id @default(cuid())
  userId     String
  eventId    String
  status     AttendanceStatus
  markedById String
  markedAt   DateTime         @default(now())

  user     User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event    Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  markedBy User  @relation("AttendanceMarker", fields: [markedById], references: [id])

  @@unique([userId, eventId])
  @@index([eventId])
}

// ─── Prayer ─────────────────────────────────────────────────────────────────

model PrayerRequest {
  id         String   @id @default(cuid())
  authorId   String
  groupId    String
  body       String
  isPinned   Boolean  @default(false)
  isAnswered Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  author User  @relation(fields: [authorId], references: [id], onDelete: Cascade)
  group  Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([groupId, isPinned, createdAt])
}

// ─── Finance ────────────────────────────────────────────────────────────────

enum ContributionType   { CHEMA WELFARE TITHE PARTNERSHIP }
enum ContributionStatus { PENDING CONFIRMED REJECTED }

model Contribution {
  id            String             @id @default(cuid())
  userId        String
  type          ContributionType
  amount        Decimal            @db.Decimal(12, 2)
  currency      String             @default("USD")
  paidAt        DateTime           @db.Date
  note          String?
  chemaYear     Int?                         // required when type = CHEMA
  chemaMonth    Int?                         // 1–12, required when type = CHEMA
  projectId     String?                      // required when type = PARTNERSHIP
  pledgeId      String?                      // optional: counts toward a pledge
  status        ContributionStatus @default(PENDING)
  recordedById  String                       // member themselves, or a finance officer
  reviewedById  String?
  reviewedAt    DateTime?
  rejectReason  String?
  reversalOfId  String?            @unique   // set on a reversing entry: the confirmed row it cancels
  createdAt     DateTime           @default(now())

  user       User                @relation(fields: [userId], references: [id], onDelete: Restrict)
  project    PartnershipProject? @relation(fields: [projectId], references: [id], onDelete: Restrict)
  pledge     Pledge?             @relation(fields: [pledgeId], references: [id], onDelete: SetNull)
  recordedBy User                @relation("ContributionRecorder", fields: [recordedById], references: [id])
  reviewedBy User?               @relation("ContributionReviewer", fields: [reviewedById], references: [id])

  @@index([userId, paidAt])
  @@index([type, status, paidAt])
  @@index([chemaYear, chemaMonth])
  @@index([projectId])
}
// Raw-SQL partial unique index in the migration:
//   CREATE UNIQUE INDEX contribution_one_chema_per_month
//   ON "Contribution"("userId","chemaYear","chemaMonth")
//   WHERE type = 'CHEMA' AND status <> 'REJECTED' AND "reversalOfId" IS NULL;
// CHECK constraints enforce the CHEMA / PARTNERSHIP column requirements, and
// that only a reversing entry (reversalOfId set) may be negative.

enum ProjectStatus { ACTIVE COMPLETED CANCELLED }

model PartnershipProject {
  id           String        @id @default(cuid())
  name         String        @unique
  description  String?
  targetAmount Decimal       @db.Decimal(12, 2)
  startDate    DateTime      @db.Date
  endDate      DateTime?     @db.Date
  status       ProjectStatus @default(ACTIVE)
  completedAt  DateTime?
  createdById  String?                     // null for the seeded projects
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  contributions Contribution[]
  pledges       Pledge[]
  createdBy     User? @relation("ProjectCreator", fields: [createdById], references: [id], onDelete: SetNull)
}

enum PledgeStatus { ACTIVE FULFILLED CANCELLED }   // "Overdue" is derived

model Pledge {
  id          String       @id @default(cuid())
  userId      String
  projectId   String?
  description String
  totalAmount Decimal      @db.Decimal(12, 2)
  dueDate     DateTime     @db.Date
  status      PledgeStatus @default(ACTIVE)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  user          User                @relation(fields: [userId], references: [id], onDelete: Restrict)
  project       PartnershipProject? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  contributions Contribution[]

  @@index([userId, status])
  @@index([dueDate, status])
}
// (draft Partnership / PartnershipPayment are removed — no production data exists)

// ─── Sermons, notes, devotions ──────────────────────────────────────────────

model Sermon {
  id           String    @id @default(cuid())
  title        String
  preacher     String                         // "Apostle Takura James Makamba" | "Apostle Edna Makamba" | guest name
  preachedAt   DateTime  @db.Date
  seriesName   String?
  scriptureRef String?
  summary      String                         // up to two paragraphs
  audioUrl     String?                        // storage URL
  audioKey     String?                        // storage key, for deletion
  videoUrl     String?                        // YouTube link
  notesUrl     String?                        // optional PDF handout
  notesKey     String?                        // its storage key, for deletion
  tags         String[]
  isPublished  Boolean   @default(true)
  uploadedById String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  uploadedBy User         @relation("SermonUploader", fields: [uploadedById], references: [id])
  notes      SermonNote[]

  @@index([isPublished, preachedAt])
  @@index([seriesName])
}

model SermonNote {                         // private to its author — selfScope only
  id        String   @id @default(cuid())
  userId    String
  sermonId  String
  body      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  sermon Sermon @relation(fields: [sermonId], references: [id], onDelete: Cascade)

  @@unique([userId, sermonId])
}

model Devotion {
  id             String    @id @default(cuid())
  title          String
  authorId       String
  scriptureRef   String
  scriptureQuote String
  body           String                      // paragraphs separated by a blank line (3 expected)
  publishOn      DateTime? @db.Date          // null = Draft; future = Scheduled; past/today = Published
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  author User @relation("DevotionAuthor", fields: [authorId], references: [id])

  @@index([publishOn])
}

// ─── Baptism ────────────────────────────────────────────────────────────────

model BaptismalRecord {                    // created with the member at enrolment
  id                  String    @id @default(cuid())
  userId              String    @unique
  baptismDate         DateTime  @db.Date
  location            String
  conductedBy         String
  classCompletedOn    DateTime? @db.Date
  certificateNumber   String?   @unique      // "KMMI-BAP-2026-0007"
  certificateIssuedAt DateTime?
  certificateIssuedBy String?
  notes               String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum CandidateStatus { IN_CLASS BAPTIZED WITHDRAWN }

/// A person preparing for baptism. Not a portal user (only the baptized may
/// be enrolled). Becomes a User at enrolment; `userId` then links the two.
model BaptismCandidate {
  id        String          @id @default(cuid())
  firstName String
  lastName  String
  phone     String?
  email     String?
  notes     String?
  status    CandidateStatus @default(IN_CLASS)
  userId    String?         @unique
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  enrollments BaptismalClassEnrollment[]
}

model BaptismalClass {
  id          String    @id @default(cuid())
  name        String
  instructor  String
  startDate   DateTime  @db.Date
  endDate     DateTime  @db.Date
  completedAt DateTime?                      // set when closed; status otherwise derived from dates
  createdAt   DateTime  @default(now())

  enrollments BaptismalClassEnrollment[]
}

model BaptismalClassEnrollment {
  id          String    @id @default(cuid())
  classId     String
  candidateId String
  completedOn DateTime? @db.Date

  class     BaptismalClass   @relation(fields: [classId], references: [id], onDelete: Cascade)
  candidate BaptismCandidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@unique([classId, candidateId])
}

// ─── Settings ───────────────────────────────────────────────────────────────

model ChurchSettings {                     // single row, id = "church"
  id          String   @id @default("church")
  name        String
  shortName   String
  tagline     String?
  mission     String?
  vision      String?
  doctrine    String?
  address     String?
  phone       String?
  email       String?
  updatedById String?
  updatedAt   DateTime @updatedAt
}

model ThemeOfYear {                        // current theme = highest year
  id           String   @id @default(cuid())
  year         Int      @unique
  title        String
  scriptureRef String
  verseText    String
  description  String?
  updatedById  String?
  updatedAt    DateTime @updatedAt

  updatedBy User? @relation("ThemeUpdater", fields: [updatedById], references: [id], onDelete: SetNull)
}

enum SocialPlatform { FACEBOOK INSTAGRAM YOUTUBE WHATSAPP }   // Twitter/X deliberately excluded

model SocialLink {
  platform  SocialPlatform @id
  handle    String
  url       String
  isVisible Boolean        @default(true)
  updatedAt DateTime       @updatedAt
}

// ─── Notifications ──────────────────────────────────────────────────────────

enum NotificationType {
  MESSAGE MESSAGE_REPLY EVENT EVENT_REMINDER GROUP_ACTIVITY PRAYER_REQUEST
  DEVOTION BIRTHDAY PLEDGE_REMINDER CONTRIBUTION_REVIEWED
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String?
  linkUrl   String?
  dedupeKey String?          @unique
  readAt    DateTime?
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt])
}
```

### 6.1 Seed data (`prisma/seed.ts`, script `npm run db:seed`)

Idempotent (`upsert`). Seeds:

- the 7 groups (§4.1) with slug, audience and description from `src/lib/church.ts`
- `ChurchSettings` from `src/lib/church.ts`
- themes 2023–2026 (2026 *Year of Kingdom Expressions*, 2 Cor 5:20; 2025 *Supernatural
  Encounters*, 2 Cor 4:17; 2024 *Divine Alignment*, Jer 29:11; 2023 *Kingdom Dominion*, Gen 1:28)
- four social links (Facebook, Instagram, YouTube, WhatsApp)
- five partnership projects: Building Fund, Missions Support, Equipment Fund, Church Van Fund,
  Community Outreach (targets to be supplied — §11)

Leaders are assigned through the UI once their accounts exist.

---

## 7. Target file structure

`+` new · `~` changed · unmarked = exists, unchanged

```
church/
├─ docs/
│  ├─ SCOPE.md                                            + this document (the requirements)
│  └─ IMPLEMENTATION_PLAN.md                              + phased delivery plan
├─ prisma/
│  ├─ schema.prisma                                       ~ §6
│  ├─ migrations/                                         ~ one migration per phase
│  └─ seed.ts                                             + §6.1
├─ public/
│  ├─ manifest.webmanifest                                + PWA (§9.22)
│  └─ icons/                                              + 192, 512, maskable
├─ vercel.json                                            + cron schedules (§9.21)
├─ src/
│  ├─ proxy.ts                                            ~ reads prefixes from lib/routes.ts
│  ├─ instrumentation.ts
│  ├─ app/
│  │  ├─ page.tsx                                         ~ landing reads settings/theme/devotion/sermons from DB
│  │  ├─ about/page.tsx                                   + mission, vision, doctrine, theme
│  │  ├─ actions.ts                                       (plan-a-visit)
│  │  ├─ manifest.ts                                      + (alternative to the static manifest)
│  │  ├─ api/
│  │  │  └─ cron/
│  │  │     ├─ reminders/route.ts                         + events, pledges
│  │  │     └─ daily/route.ts                             + birthdays, devotion of the day
│  │  ├─ (auth)/                                          ~ login error wording (§9.1)
│  │  └─ (app)/
│  │     ├─ layout.tsx                                    ~ rail by permission
│  │     ├─ _components/
│  │     │  ├─ nav.ts                                     ~ §8
│  │     │  ├─ notification-bell.tsx                      ~ mark read, polling
│  │     │  ├─ money.tsx                                  + <Money/> formatter
│  │     │  ├─ status-badge.tsx                           + Paid/Unpaid/Pending/Overdue/…
│  │     │  ├─ group-badge.tsx                            +
│  │     │  ├─ empty-state.tsx                            +
│  │     │  └─ pagination.tsx                             +
│  │     ├─ dashboard/page.tsx                            ~ §9.2
│  │     ├─ profile/                                      + own church profile
│  │     │  ├─ page.tsx
│  │     │  ├─ actions.ts                                 (updateOwnProfile, uploadAvatar)
│  │     │  └─ profile-form.tsx
│  │     ├─ members/                                      ~
│  │     │  ├─ page.tsx                                   ~ directory with search & group filter
│  │     │  ├─ new/page.tsx                               + enrolment form (baptism required)
│  │     │  ├─ new/enroll-form.tsx                        +
│  │     │  ├─ [id]/page.tsx                              + member detail (tabs)
│  │     │  ├─ [id]/edit/page.tsx                         +
│  │     │  ├─ actions.ts                                 ~ enrollMember, updateMember, + existing
│  │     │  └─ form-state.ts                              ~
│  │     ├─ groups/                                       +
│  │     │  ├─ page.tsx                                   list (all for Apostle, own for others)
│  │     │  ├─ [id]/page.tsx                              members, leader, prayer, events, announcements tabs
│  │     │  ├─ group-form.tsx
│  │     │  ├─ actions.ts                                 createGroup, updateGroup, deleteGroup, setLeader, addMembers, removeMember
│  │     │  └─ form-state.ts
│  │     ├─ messages/                                     +
│  │     │  ├─ page.tsx                                   inbox
│  │     │  ├─ sent/page.tsx                              sent (leaders, Apostles)
│  │     │  ├─ new/page.tsx + compose-form.tsx
│  │     │  ├─ [id]/page.tsx                              message + thread(s)
│  │     │  ├─ actions.ts                                 sendMessage, reply, markRead, markAllRead
│  │     │  └─ form-state.ts
│  │     ├─ events/                                       +
│  │     │  ├─ page.tsx                                   ?view=calendar|list
│  │     │  ├─ calendar.tsx / event-list.tsx
│  │     │  ├─ new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
│  │     │  ├─ [id]/attendance/page.tsx + attendance-sheet.tsx
│  │     │  ├─ event-form.tsx
│  │     │  ├─ actions.ts                                 createEvent, updateEvent, deleteEvent, duplicateEvent, markAttendance
│  │     │  └─ form-state.ts
│  │     ├─ attendance/page.tsx                           + overview: own history / group / church
│  │     ├─ prayer/                                       +
│  │     │  ├─ page.tsx                                   ?group=
│  │     │  ├─ prayer-form.tsx
│  │     │  └─ actions.ts                                 postRequest, togglePin, markAnswered, removeRequest
│  │     ├─ finance/                                      +
│  │     │  ├─ page.tsx                                   my giving: summary, chema grid, history
│  │     │  ├─ log-payment-dialog.tsx
│  │     │  ├─ church/page.tsx                            overview: charts + table (finance.viewAll)
│  │     │  ├─ chema/page.tsx                             compliance by month (?month=&year=&group=)
│  │     │  ├─ review/page.tsx                            pending payments queue (finance.confirm)
│  │     │  ├─ pledges/page.tsx                           my pledges / all pledges
│  │     │  ├─ export/route.ts                            CSV (finance.export)
│  │     │  ├─ actions.ts                                 logPayment, recordForMember, confirm, reject, createPledge, cancelPledge
│  │     │  └─ form-state.ts
│  │     ├─ partnerships/                                 +
│  │     │  ├─ page.tsx                                   project cards with progress
│  │     │  ├─ [id]/page.tsx                              detail + contributor table
│  │     │  ├─ project-form.tsx
│  │     │  └─ actions.ts                                 createProject, updateProject, completeProject
│  │     ├─ sermons/                                      +
│  │     │  ├─ page.tsx                                   search + filters
│  │     │  ├─ new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
│  │     │  ├─ sermon-form.tsx, sermon-card.tsx, audio-player.tsx
│  │     │  ├─ [id]/note-editor.tsx                       private note
│  │     │  ├─ actions.ts                                 createSermon, updateSermon, deleteSermon, saveNote, deleteNote
│  │     │  └─ form-state.ts
│  │     ├─ notes/page.tsx                                + "My sermon notes" index
│  │     ├─ devotions/                                    +
│  │     │  ├─ page.tsx                                   feed (+ drafts/scheduled for Apostles)
│  │     │  ├─ new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
│  │     │  ├─ devotion-form.tsx
│  │     │  └─ actions.ts
│  │     ├─ birthdays/page.tsx + actions.ts               + announceBirthdays
│  │     ├─ baptism/                                      +
│  │     │  ├─ page.tsx                                   records
│  │     │  ├─ [id]/page.tsx                              record + certificate
│  │     │  ├─ [id]/certificate/page.tsx                  printable certificate
│  │     │  ├─ classes/page.tsx, classes/[id]/page.tsx
│  │     │  ├─ candidates/page.tsx
│  │     │  └─ actions.ts
│  │     ├─ notifications/page.tsx + actions.ts           +
│  │     ├─ settings/                                     +
│  │     │  ├─ page.tsx                                   church info
│  │     │  ├─ theme/page.tsx                             theme of the year + history
│  │     │  ├─ social/page.tsx
│  │     │  └─ actions.ts
│  │     ├─ audit/page.tsx                                ~ permission audit.view
│  │     └─ account/page.tsx
│  ├─ components/
│  │  ├─ landing/                                         ~ take props from DB instead of lib/church.ts
│  │  │  └─ birthdays-strip.tsx                           + (only if §11 Q3 allows)
│  │  └─ ui/                                              + chart, calendar, checkbox, progress, switch, command…
│  └─ lib/
│     ├─ auth/
│     │  ├─ dal.ts                                        ~ §5.2
│     │  └─ permissions.ts                                + §4.2
│     ├─ data/                                            + one scoped read module per feature
│     │  ├─ members.ts  groups.ts  messages.ts  events.ts  attendance.ts  prayer.ts
│     │  ├─ finance.ts  partnerships.ts  sermons.ts  notes.ts  devotions.ts
│     │  └─ birthdays.ts  baptism.ts  settings.ts
│     ├─ finance/
│     │  ├─ chema.ts                                      + expectedChema(month), compliance()
│     │  └─ money.ts                                      + Decimal helpers, formatting
│     ├─ dates.ts                                         + Harare "today", month bounds, next birthday
│     ├─ csv.ts                                           + RFC 4180 writer, formula-injection safe
│     ├─ notifications.ts                                 + notify()
│     ├─ storage.ts                                       + upload / delete / signed URL
│     ├─ settings.ts                                      + cached getters, tag "church-settings"
│     ├─ routes.ts                                        + PROTECTED_PREFIXES shared with next.config.ts
│     ├─ church.ts                                        ~ static timetable only
│     ├─ email.ts  env.ts  prisma.ts  utils.ts
```

---

## 8. Navigation map

`src/app/(app)/_components/nav.ts`. Each item declares `permission?: Permission` or
`leaderOnly?: true`; `railFor(user, ledGroupIds)` filters. Presentation only — pages re-check.

| Section | Item | Route | Visible to |
|---|---|---|---|
| Overview | Dashboard | `/dashboard` | all |
| People | Members | `/members` | `members.viewAll`, `members.enroll`, leaders |
| | Connect groups | `/groups` | all |
| | Birthdays | `/birthdays` | all |
| | Baptism records | `/baptism` | `baptism.manage` |
| Church life | Messages | `/messages` | all |
| | Events | `/events` | all |
| | Prayer requests | `/prayer` | all |
| | Sermons | `/sermons` | all |
| | Devotions | `/devotions` | all |
| Records | Attendance | `/attendance` | all |
| | My giving | `/finance` | all |
| | Church finance | `/finance/church` | `finance.viewAll` |
| | Chema compliance | `/finance/chema` | `finance.viewAll`, leaders |
| | Payment review | `/finance/review` | `finance.confirm` |
| | Partnerships | `/partnerships` | all |
| You | Profile | `/profile` | all |
| | My sermon notes | `/notes` | all |
| | Notifications | `/notifications` | all |
| | Account | `/account` | all |
| Admin | Settings | `/settings` | `settings.manage` |
| | Audit log | `/audit` | `audit.view` |

---

## 9. Feature specifications

Each feature: **Purpose · Who · Routes · Data · Actions · Rules · UI · Notifications · Audit ·
Acceptance criteria.** "Leader" always means *leader of the group in question*.

---

### 9.1 Authentication & access control

**Purpose.** Only enrolled, baptized members get in; each sees what their office allows.

**Who.** Everyone. Enrolment (which creates the account) is §9.3.

**Exists.** Login, invite/accept, forgot/reset/change password, lockout, DB sessions, bootstrap.

**Changes.**
1. Role enum migration (§4.1) and `permissions.ts` (§4.2).
2. Replace every `requireAdmin()` with the appropriate `requirePermission()`.
3. Replace `role === "ADMIN"` checks in UI (dashboard, landing nav, member row) with `can()`.
4. Login error wording (KMMI 3.1):
   - unknown email → *"Email not found — please contact Minister Winnie."*
   - deactivated account → *"Access denied for this portal."*
   - wrong password / locked → keep existing wording.
   > Note: distinguishing "email not found" reveals whether an address is enrolled. Leadership
   > asked for it explicitly; the lockout and rate-limiting already in place limit the risk.
5. Bootstrap creates an `APOSTLE`.
6. Role-change UI lists the four offices; an Apostle cannot demote themselves; the last active
   Apostle cannot be demoted or deactivated.

**Acceptance criteria.**
- A `MEMBER` requesting `/finance/church`, `/settings`, `/audit` or calling any of their actions
  directly is redirected to `/dashboard` and nothing is written.
- Changing someone's role ends all their sessions.
- The system refuses to leave zero active Apostles.

---

### 9.2 Dashboard

**Route.** `/dashboard`

**Member sees.**
- Greeting (exists) and gold **birthday banner** if today is their birthday (dismissible; stored
  in `localStorage`, per year).
- **Theme of the Year** card (from DB).
- **Today's devotion**: title, scripture ref, first two lines, *Read more* → `/devotions/[id]`.
- **Latest sermon** card.
- **Upcoming events** (next 3 visible to them).
- **My giving this year**: total by type; this month's chema status (Paid / Pending / Unpaid).
- **My attendance rate** (last 12 months).
- **Active pledges** with progress; overdue ones with a red border.
- **Birthdays this week** (name, day, group).
- Unread messages count.

**Leaders additionally.** "My group" card: member count, last event's attendance, chema compliance
this month (paid/total).

**Elder / Apostle additionally.** Finance this month by type (confirmed), pending reviews count,
active projects progress. Apostle also: total active members, new enrolments this month.

**Acceptance.** Every figure is computed by a scoped query; a member's dashboard contains no data
about any other member except birthday names and group names.

---

### 9.3 Member management & enrolment

**Purpose.** Hold the church roll; enrol only baptized people.

**Who.** Enrol: Apostle, Matron. Edit all fields: Apostle. View directory: Apostle (all),
leaders (members of their groups), Matron (all — needed to manage baptism records; contact
details only). Members: own profile only.

**Routes.**
| Route | Purpose |
|---|---|
| `/members` | Directory: search by name/email/phone, filter by group, role, active; paginated |
| `/members/new` | Enrolment form |
| `/members/[id]` | Detail, tabs: Profile · Groups · Attendance · Giving · Pledges · Baptism |
| `/members/[id]/edit` | Edit (Apostle) |
| `/profile` | Own profile view + edit of personal fields |

**Enrolment form fields.** First name*, last name*, email*, phone, address, date of birth,
gender, connect group(s)*, office (Apostle only may choose other than Member), **baptism
date\***, **baptism location\***, conducted by\*, class completion date, notes. Optional: link to
an existing `BaptismCandidate`.

**Actions** (`members/actions.ts`).
| Action | Guard | Behaviour |
|---|---|---|
| `enrollMember` | `members.enroll` | Zod; in one transaction create `User` (no password), `BaptismalRecord`, `GroupMembership`s, mark linked candidate `BAPTIZED` + set `userId`; audit `MEMBER_ENROLLED`; then issue INVITE token and email (reuse current invite code path incl. "copy link" fallback) |
| `updateMember` | `members.edit` | Edits any field incl. groups; audit `MEMBER_UPDATED` with changed field names (not values) |
| `updateOwnProfile` | session | Only phone, address, date of birth, gender, avatar. Name/email changes go through the office. |
| `setRole`, `setActive`, `resendInvitation`, `sendPasswordReset` | exist | Switch guards to permissions |

**Rules.**
- Baptism date is required and must not be in the future. Error text exactly:
  *"Baptism date is required. Only baptized members can be enrolled."*
- Email unique, lower-cased.
- Group leaders' directory shows: name, avatar, phone, email, groups, attendance rate, chema
  status this month. **Not** tithe/welfare/partnership amounts.
- Member detail Giving tab visible only with `finance.viewAll`.

**Acceptance.**
- Submitting enrolment without a baptism date is rejected on the server even if the client
  check is bypassed.
- Matron can enrol but cannot open `/members/[id]/edit` or change roles.
- A leader opening `/members/[id]` for someone outside their groups gets 404.

---

### 9.4 Connect groups

**Purpose.** Organise members into the seven groups; give each leader a space.

**Routes.** `/groups` (Apostle: all groups with leader and member count; others: the groups they
belong to or lead), `/groups/[id]` with tabs **Members · Announcements · Events · Prayer**.

**Actions.**
| Action | Guard | Notes |
|---|---|---|
| `createGroup`, `updateGroup` | `groups.manage` | name, slug (auto), audience, description |
| `deleteGroup` | `groups.manage` | Blocked while it has members or events; audit |
| `setLeader(groupId, userId \| null)` | `groups.manage` | Leader is added as a member if not already; audit `GROUP_LEADER_CHANGED` |
| `addMembers(groupId, userIds[])`, `removeMember` | `groups.manage` | Leaders cannot change membership |

**Rules.** A group with `leaderId = null` shows **Vacant**. Members of a group see fellow members'
names, avatars and the leader — no contact details. A member cannot see groups they are not in
(except names on the public site).

**Notifications.** Added to a group → `GROUP_ACTIVITY` to the member.

**Acceptance.** Changing a leader immediately changes who can mark that group's attendance and
post to it (no re-login needed).

---

### 9.5 Messages & announcements

**Purpose.** A targeted inbox. "Announcement" and "message" are the same object.

**Who sends.** Apostle → all church, any group, any member. Leader → their group, or an
individual member of their group. Members cannot start messages; they reply.

**Routes.** `/messages` (inbox), `/messages/sent`, `/messages/new`, `/messages/[id]`.

**Send flow (`sendMessage`).**
1. Guard by audience: `ALL` needs `messages.sendAll`; `GROUP` needs leader of that group or
   Apostle; `INDIVIDUAL` needs Apostle or leader of a group the recipient belongs to.
2. Resolve recipients **at send time**: all active users / active members of the group / the one
   user. Exclude the sender.
3. Transaction: create `Message`, `createMany` `MessageRecipient`, `notify(MESSAGE)`.
4. Optional checkbox "Also email" (Apostle only) sends via Resend after commit.

**Replies.** `reply(messageId, body, threadUserId?)`:
- a recipient replies → thread is theirs (`threadUserId = self`); must be a recipient.
- the sender replies → must pass `threadUserId` of a recipient who has replied.
- Visible only to the sender, that recipient, and Apostles. Notifies the other party
  (`MESSAGE_REPLY`).

**Inbox UI.** Newest first. Each row: sender name + role/office badge, subject, target
("All Church" / group name / "Personal"), relative time. Unread = bold subject + blue dot.
Mark read on open; **Mark all read** button. Sent view shows read count ("23 of 41 read") and
threads with unread replies.

**Acceptance.**
- Member A cannot see member B's reply to the same group message.
- A member who joins a group after a message was sent does not receive it.
- A leader cannot target a group they do not lead, even by editing the form's hidden field.

---

### 9.6 Events

**Purpose.** Church calendar for all-church and group events; the anchor for attendance.

**Who.** Create / edit / delete / duplicate: Apostle. View: everyone sees all-church events plus
events of groups they belong to; Apostle sees all.

**Routes.** `/events?view=calendar|list&month=YYYY-MM`, `/events/new`, `/events/[id]`,
`/events/[id]/edit`, `/events/[id]/attendance`.

**Fields.** Title*, description, date*, start time*, end time, location, target (All Church or a
group)*.

**UI.**
- Calendar: month grid, gold dot on days with events, click a day → list for that day.
- List: **Upcoming** (ascending) and **Past** (descending, muted).
- Detail: details, target badge, and for leaders/Apostle a *Take attendance* button.

**Actions.** `createEvent`, `updateEvent`, `deleteEvent` (blocked if attendance exists, unless
confirmed; audit), `duplicateEvent(id, newDate)`.

**Notifications.** On create → `EVENT` to the audience. Reminder → §9.21 (24 h before; dedupe
per user per event). Editing date/time/location re-notifies the audience.

**Acceptance.** A member of Youth Alive never sees a Kingdom Total Women event in any view,
count or notification.

---

### 9.7 Attendance

**Purpose.** Know who attended what; give each member an attendance rate.

**Who marks.** For a group event: that group's leader, or Apostle. For an all-church event: each
leader marks **their own group's members**; Apostle can mark anyone.

**Routes.** `/events/[id]/attendance` (the sheet), `/attendance` (overview).

**Sheet UI.** List of members the marker may mark, each with Present / Absent toggle, "Mark all
present" shortcut, search, and who last marked it. Saves in one action.

**Action.** `markAttendance(eventId, entries: {userId, status}[])`: verify every `userId` is
markable by the caller for this event; upsert on `(userId, eventId)`; set `markedById`.
Not allowed for events more than 24 h in the future.

**Attendance rate.** `present / (present + absent)` over records in the period (default last 12
months). Members with no records show "—", not 0 %.

**`/attendance` overview.** Member: own history table (event, date, status) + rate. Leader: per
group — events × members matrix and each member's rate. Apostle: church-wide by event with
present counts and a group filter.

**Acceptance.** A leader submitting a `userId` outside their group in the payload causes the
whole action to fail with nothing written.

---

### 9.8 Prayer requests

**Purpose.** Intercession within a connect group.

**Routes.** `/prayer?group=<id>` (tabs per group the user belongs to; Apostle: all groups + "All").

**Actions.**
| Action | Who |
|---|---|
| `postRequest(groupId, body)` | member of that group |
| `togglePin(id)` | leader of the group, Apostle |
| `markAnswered(id)` | author, leader, Apostle |
| `removeRequest(id)` | author, leader, Apostle (audit when not the author) |

**Rules.** Pinned first, then newest. Requests stay until removed. Max 1,000 characters. Visible
only to members of that group and Apostles.

**Notifications.** New request → `PRAYER_REQUEST` to the group's leader (not every member, to
avoid noise). Pinned → `GROUP_ACTIVITY` to the group.

**Acceptance.** Requests from another group are absent from lists, counts and direct URLs.

---

### 9.9 Finance — chema, welfare, tithe, partnership

**Purpose.** Record every contribution against the member; give leadership an accurate picture.

**Types and rules.**
| Type | Rule |
|---|---|
| **Chema** | Monthly subscription. Expected: **$5.00 in January, $1.00 every other month.** One per member per month (DB-enforced). Member picks the month it pays for (default: current Harare month). |
| **Welfare** | Free amount, date, optional note. Replaces Offering. |
| **Tithe** | Free amount entered by the member (not calculated), date, optional note. |
| **Partnership** | Free amount toward an **active** project; optionally applied to one of the member's pledges. |

`src/lib/finance/chema.ts`:

```ts
export function expectedChema(month: number): Prisma.Decimal  // 1 → 5.00, 2–12 → 1.00
export function chemaCompliance(year, month, userIds): Map<userId, "PAID" | "PENDING" | "UNPAID">
```

**Logging and confirmation** (see §11 Q2).
- Members log their own payments → `PENDING`.
- Apostle / Elder review at `/finance/review`: **Confirm** or **Reject** (reason required).
  Member is notified (`CONTRIBUTION_REVIEWED`).
- Apostle / Elder can **record for a member** (e.g. cash handed in) → created `CONFIRMED`,
  `recordedById` = officer; audit.
- Confirmed rows are never edited or deleted. A mistake is corrected by recording a reversing
  entry (negative amount, note required) by an officer.
- Totals and compliance count **CONFIRMED** only; PENDING shows separately in amber.

**Routes.**
| Route | Who | Content |
|---|---|---|
| `/finance` | all | **Log payment** button (modal: type, amount, date, chema month / project / pledge as relevant, note); this-year totals per type; **12-month chema grid** (Paid green / Pending amber / Unpaid red / future grey); history table filterable by type and year |
| `/finance/church` | `finance.viewAll` | Period + group filters; KPI totals per type; **bar chart: amount by type per group**; **line chart: monthly totals**; table of contributions; *Export CSV* |
| `/finance/chema` | `finance.viewAll`; leaders for their groups | Month/year picker; table: member, group, expected, status badge, date paid; compliance % |
| `/finance/review` | `finance.confirm` | Pending queue, oldest first, bulk confirm |
| `/finance/pledges` | all (own); `finance.viewAll` (all) | §9.10 |
| `/finance/export` | `finance.export` | CSV |

**CSV export** (`finance/export/route.ts`). Query params mirror the church page filters. Columns:
`date, member, email, group(s), type, chema_month, project, amount, currency, status, note,
recorded_by, reviewed_by`. Values beginning `= + - @` are prefixed with `'` (formula
injection). Filename `kmmi-finance-YYYY-MM-DD.csv`. Audit `FINANCE_EXPORTED` with the filter.

**Acceptance.**
- A second chema for the same member and month is rejected (unless the first was rejected).
- A leader sees Paid/Unpaid for their group's chema and nothing else financial.
- Chart totals equal the table totals for the same filters.

---

### 9.10 Partnership projects & pledges

**Projects** (`/partnerships`, `/partnerships/[id]`).
- Apostle creates/edits: name, description, target amount, start date, end date.
- Cards: name, description, **progress bar** (confirmed raised ÷ target, capped at 100 % visually,
  real figure shown), days left, status badge (Active green / Completed blue / Cancelled grey).
- **Mark complete**: confirmation dialog → `COMPLETED`, `completedAt`; no new contributions
  accepted; audit `PROJECT_COMPLETED`.
- Detail: Apostle / Elder see the **contributor table** (member, group, amount, date, note);
  members see only their own contributions to the project and the overall progress.

**Pledges** (`/finance/pledges`).
- Member creates: description, total amount, due date, optional project.
- Progress = confirmed contributions linked to the pledge ÷ total.
- Status: **Active**, **Fulfilled** (set automatically when paid ≥ total), **Cancelled** (by member
  or officer), **Overdue** = derived (active, past due, not fully paid) → red border.
- Reminders: 7 days and 1 day before due, and on the day it becomes overdue (§9.21).
- Officers see all pledges with filters (status, project, group).

**Acceptance.** Raised amounts are computed live from confirmed contributions; there is no stored
`amountRaised` to drift.

---

### 9.11 Sermons

**Who.** Apostle manages. Everyone signed in views.

**Routes.** `/sermons` (search `?q=`, filters `?series=&preacher=&tag=`), `/sermons/new`,
`/sermons/[id]`, `/sermons/[id]/edit`.

**Fields.** Title*, preacher* (select: Apostle Takura James Makamba, Apostle Edna Makamba, or
*Guest speaker* + name), date preached*, series (free text with suggestions from existing, seeded
with *Kingdom Living*, *Ambassadors of Christ*, *Faith Foundations*), scripture reference,
summary* (≤ 2 paragraphs), audio file (mp3/m4a, ≤ 100 MB, uploaded to storage), YouTube URL
(validated `youtube.com`/`youtu.be`), notes PDF (optional), tags.

**UI.** Cards: date badge, title, preacher, scripture in gold, series badge, tag pills; buttons
**Play audio** (inline player), **Watch video** (opens YouTube in new tab), **Download notes**
(when present). Most recent shows a **Latest** badge. Detail page: full summary, player, and the
member's **private note editor** (§9.12).

**Search.** Case-insensitive match on title, preacher, scripture ref; exact match on tag. (Upgrade
to Postgres full-text if the archive grows past ~1,000.)

**Actions.** `createSermon`, `updateSermon`, `deleteSermon` (deletes storage objects; audit).
`isPublished = false` hides a sermon from members (draft).

**Public.** Landing page shows the three most recent published sermons (title, preacher, date,
scripture, summary excerpt) — no media without signing in.

**Acceptance.** A member cannot reach any sermon action; a deleted sermon's audio URL stops
resolving.

---

### 9.12 Personal sermon notes

**Purpose.** Private reflection per sermon.

**Where.** Editor on `/sermons/[id]`; index at `/notes` (sermon title, last edited, excerpt).

**Actions.** `saveNote(sermonId, body)` upsert on `(userId, sermonId)`; `deleteNote(sermonId)`.
Autosave 1.5 s after typing stops, plus explicit Save; shows "Saved hh:mm".

**Rule.** Every read and write uses `selfScope` — **no other user, including Apostles, can read
a note, and no admin screen lists them.** Notes are excluded from CSV exports and the audit log
records nothing about their content.

**Acceptance.** There is no code path that returns another user's note; a test asserts this for an
Apostle session.

---

### 9.13 Notifications

**Bell** (exists, read-only) gains: unread badge, **mark one read** on click, **mark all read**,
polling every 60 s via a lightweight route (`/api/notifications/count`) or `router.refresh()`.

**`/notifications`.** Full list, filter by type, paginated.

**Sources.**
| Type | Trigger | Recipients |
|---|---|---|
| `MESSAGE` | message sent | resolved recipients |
| `MESSAGE_REPLY` | reply | other party |
| `EVENT` | event created / changed | audience |
| `EVENT_REMINDER` | cron, 24 h before | audience |
| `GROUP_ACTIVITY` | added to group, request pinned | as §9.4 / §9.8 |
| `PRAYER_REQUEST` | new request | group leader |
| `DEVOTION` | cron, morning of `publishOn` | all active members |
| `BIRTHDAY` | cron, daily | the celebrant |
| `PLEDGE_REMINDER` | cron | pledge owner |
| `CONTRIBUTION_REVIEWED` | confirm / reject | contributor |

**Rules.** `linkUrl` is an internal path only (the layout already strips anything else). Keep 180
days; a daily cron deletes older read notifications.

---

### 9.14 Daily devotions

**Who.** Apostles write; everyone reads.

**Routes.** `/devotions` (feed: searchable grid, newest first, **Latest** badge on today's;
Apostles also see Draft and Scheduled tabs), `/devotions/new`, `/devotions/[id]`,
`/devotions/[id]/edit`.

**Fields.** Title*, author (defaults to the signed-in Apostle; selectable between the two),
scripture reference*, scripture quote*, body* (three paragraphs), publish date (empty = draft).

**Status (derived).** `publishOn = null` → **Draft**; `publishOn > today (Harare)` → **Scheduled**;
otherwise **Published**. No cron is needed to publish — members' queries filter
`publishOn <= today`.

**Detail page.** Large title (heading font), scripture blockquote with gold left border,
paragraphs, author and date, previous/next.

**Public.** Landing page shows today's devotion teaser: title, scripture, first paragraph faded
and blurred, **Sign in to continue** button.

**Acceptance.** A scheduled devotion is invisible to members (lists, detail URL, dashboard, public
teaser) until its date in Harare time.

---

### 9.15 Birthdays

**Data.** Calculated from `User.dateOfBirth` (active members only). No birthday table.

**Rule.** Birthday is *today* when day and month match today in Harare. 29 February birthdays are
celebrated on 28 February in non-leap years. **Year of birth and age are never shown to other
members** — only to Apostles and the member themself.

**Route `/birthdays`.** Sections **Today · This week · This month · All members by month**. All
members view grouped by month, sorted by day, searchable, filterable by group. Entry: avatar,
name, day + month, group badge, badge *Today* (green) or *in N days* (blue).

**Dashboard.** Celebrant banner; *Birthdays this week* card.

**Announcement.** Apostle presses **Send birthday announcement** on today's section → pre-filled
all-church message listing today's celebrants (editable before sending). Uses §9.5.

**Notification.** Celebrant gets `BIRTHDAY` in the morning (cron).

**Public landing page.** See §11 Q3 — **default: not shown publicly.**

---

### 9.16 Baptism records, classes and candidates

**Who.** Matron and Apostle manage. Members see their own record on `/profile`.

**Records** (`/baptism`, `/baptism/[id]`).
- One per enrolled member, created at enrolment (§9.3).
- Table: member, baptism date, location, conducted by, class completed, certificate badge
  (**Pending** amber / **Issued** blue). Filters: certificate status, year.
- **Issue certificate**: assigns `certificateNumber` `KMMI-BAP-<year>-<4-digit seq>`, sets issued
  date and issuer; badge turns blue; audit `CERTIFICATE_ISSUED`; member notified.
- `/baptism/[id]/certificate`: printable A4 certificate (print stylesheet) with name, date,
  location, officiant, number and the church's name.

**Candidates** (`/baptism/candidates`). People preparing for baptism (not portal users): name,
phone, email, notes, status. **Enrol as member** opens §9.3 pre-filled and links the candidate.

**Classes** (`/baptism/classes`, `/baptism/classes/[id]`).
- Fields: class name, instructor, start date, end date; enrolled candidates (multi-select).
- Status derived: **Upcoming** (before start), **Ongoing**, **Completed** (after end or closed).
- Per enrollee: mark class completed (date). *View enrollees* shows name, status, and — once
  baptized and enrolled — baptism date and certificate status.

**Acceptance.** Matron can do everything in this module but cannot open finance, settings or
other groups' data.

---

### 9.17 Theme of the Year

**Route.** `/settings/theme` (Apostle).

**Form.** Year*, title*, scripture reference*, verse text*, description. Saving an existing year
updates it; a new year creates it and it becomes current (highest year).

**Displayed.** Landing page (gold badge in hero + feature card), About page, dashboard. Each
shows *"Last updated by Apostle … on …"*.

**History.** Read-only table of previous years below the form and on the About page.

**Mechanics.** `revalidateTag("church-settings")` on save (§5.5). Audit `THEME_UPDATED`.

---

### 9.18 Church info & social media

**Routes.** `/settings` (church name, tagline, mission, vision, doctrine, address, phone, email),
`/settings/social` (handle, URL, visible toggle per platform).

**Rules.** Platforms limited to Facebook, Instagram, YouTube, WhatsApp. URLs must be `https://`
on the platform's domain (WhatsApp: `wa.me`). Shown on landing page and footer as round blue
buttons with gold inline-SVG icons (existing `social-icons.tsx`), handle below, opens in new tab
with `rel="noopener noreferrer"`. Audit `SETTINGS_UPDATED`.

---

### 9.19 Public website

Existing landing page sections stay; their content moves from `src/lib/church.ts` to the
database:

| Section | Source after change |
|---|---|
| Hero theme badge, Theme card | `ThemeOfYear` (current) |
| Social channels, footer | `SocialLink` |
| Groups | `Group` (name, audience, description, leader name or Vacant) |
| Devotion teaser | today's published `Devotion` |
| Sermons | 3 latest published `Sermon` |
| Church name, address, contacts | `ChurchSettings` |
| Service times, weekly timetable | stays static in `lib/church.ts` |

Add `/about` (mission, vision, doctrine, leadership, theme + history). Fix the copy that still says
"Tithes & Offerings" → "Tithes & Giving". Pages are statically rendered and revalidated by the
`church-settings` tag and on devotion/sermon changes.

---

### 9.20 File storage

`src/lib/storage.ts`:

```ts
upload(file: File, { folder: "sermons/audio" | "sermons/notes" | "avatars" }): Promise<{ url, key }>
remove(key: string): Promise<void>
```

- Provider: Vercel Blob (simplest on Vercel) or Cloudflare R2. Keys/tokens added to
  `src/lib/env.ts` and `.env.example`.
- Server-side validation of MIME type and size: audio ≤ 100 MB (mp3, m4a), PDF ≤ 10 MB,
  avatars ≤ 2 MB (jpeg, png, webp; resized client-side to 512 px).
- Large audio uses client-direct upload with a server-issued token (Server Action body limits).
- Update CSP in `next.config.ts`: `media-src` and `img-src` add the storage origin;
  `connect-src` adds it for direct uploads.

---

### 9.21 Scheduled jobs

`vercel.json`:

```json
{ "crons": [
  { "path": "/api/cron/daily",     "schedule": "0 4 * * *" },
  { "path": "/api/cron/reminders", "schedule": "0 * * * *" }
] }
```
(04:00 UTC = 06:00 Harare.)

Both handlers require `Authorization: Bearer ${CRON_SECRET}` (new env var), are idempotent through
`Notification.dedupeKey`, and log a one-line summary.

| Job | Does |
|---|---|
| `daily` | birthday notifications; devotion-of-the-day notification; pledge reminders (7 d, 1 d, overdue); purge read notifications > 180 d; purge expired sessions and auth tokens |
| `reminders` (hourly) | event reminders for events starting in 23–25 h without `reminderSentAt` |

---

### 9.22 PWA

`public/manifest.webmanifest` (or `src/app/manifest.ts`): name "KMMI Portal", short name "KMMI",
`start_url: /dashboard`, `display: standalone`, theme colour = brand blue, icons 192/512 +
maskable, linked from the root layout. No offline caching of private data (a service worker, if
added later, must not cache `/dashboard`, `/finance` or any private route).

---

### 9.23 Audit log

Exists. Change guard to `audit.view`, add the actions in §5.6, add filters by action, actor and
date range.

---

## 10. Delivery plan

Each phase is one or more PRs on feature branches, each with its own migration, passing lint and
build in CI. Later phases depend on earlier ones.

| Phase | Deliverables | Depends on |
|---|---|---|
| **0 — Foundation** | Role migration, `permissions.ts`, DAL scopes, `lib/routes.ts`, nav by permission, member profile fields, `BaptismalRecord`, enrolment form with required baptism, `/profile`, `ChurchSettings`/`ThemeOfYear`/`SocialLink` + settings pages, landing reads DB, seed script | — |
| **1 — Groups & communication** | Groups (+ leaders), messages with private reply threads, `notify()`, notifications page and bell actions | 0 |
| **2 — Events & attendance** | Events (calendar/list), attendance sheets, attendance overview and rates, prayer requests | 1 |
| **3 — Finance** | Contributions (4 types), chema logic, review queue, projects, pledges, charts, CSV, finance on dashboard and member detail | 0, 1 |
| **4 — Content** | Storage, sermons, private notes, devotions, public teasers | 0 |
| **5 — Records & celebration** | Baptism candidates/classes/certificates, birthdays, cron jobs (all reminders), PWA, audit filters | 1–4 |
| **6 — Hardening** | Tests for permissions & scopes, chema, birthdays, notes privacy; accessibility pass; real church contact details; production env; data import of existing members | all |

**Testing.** Add Vitest for pure logic (`permissions`, `chema`, `dates`, `csv`) and integration
tests against a Docker Postgres for every `lib/data/*` scope: for each feature, assert a member,
a leader of another group, the Matron and the Elder each get exactly the rows §4.3 allows.

**Definition of done (per feature).** Server-side guard on page and every action; scoped reads in
`lib/data`; Zod on every input; audit for privileged writes; notifications where specified;
works at 360 px width and in dark mode; empty, loading and error states; acceptance criteria
above demonstrated in the PR description.

---

## 11. Open decisions

The default applies until leadership decides otherwise.

| # | Question | Default in this document |
|---|---|---|
| Q1 | Elder's finance access: the role section says *full church finance*, the access table (garbled in extraction) hints at Youth only. | **Full** church finance + export |
| Q2 | Should member-logged payments need confirmation by the Apostle/Elder before counting? | **Yes** — PENDING until confirmed (§9.9) |
| Q3 | Should birthdays (names) appear on the **public** landing page? This publishes members' personal data. | **No** — portal only |
| Q4 | Baptismal classes come before baptism, but only the baptized may be enrolled. | **Candidates** are a separate, non-user record (§9.16) |
| Q5 | Can members see fellow group members' phone numbers? | **No** — names and avatars only |
| Q6 | Partnership project targets and dates for the five seeded projects. | Needed before go-live |
| Q7 | Real church address, phone and email (current values are placeholders). | Needed before go-live |
| Q8 | Login message "Email not found" reveals whether someone is enrolled. | Implemented as requested (§9.1) |
| Q9 | Should leaders be able to create events for their own group? KMMI says no. | **No** — Apostle only |
| Q10 | Hosting and Praise & Worship leaders. | Shown as **Vacant** |

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Chema** | Monthly church subscription: $5 in January, $1 in other months |
| **Welfare** | Free-will contribution that replaced Offering |
| **Partnership project** | A church fundraising goal with a target (e.g. Building Fund) |
| **Pledge** | A member's promise to give a total amount by a date |
| **Connect group** | One of the seven ministry groups |
| **Leader** | The person set as `Group.leaderId` of a group |
| **Office** | The `User.role`: Apostle, Matron, Elder or Member |
| **Scope** | A Prisma `where` fragment that limits rows to what the caller may see |
| **DAL** | Data Access Layer, `src/lib/auth/dal.ts` — the security boundary |
| **Harare time** | `Africa/Harare` (UTC+2), used for all "today" logic |
