# Sadhana Companion — Architecture

Industry-grade temple management platform. **Phase 1 (this codebase): DRM (Devotee Relationship Management) + Sadhana Companion**, interconnected. Future phases: book stock management, book purchase website, main temple website.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) — single full-stack app
- **PostgreSQL + Prisma 6** — relational core
- **NextAuth v5** (credentials, JWT sessions) — auth
- **Tailwind v4** — devotional saffron/maroon/cream theme
- Deploy target: Docker on EC2 (standalone output), same pattern as the previous apps

## Roles & the "milkyway" hierarchy

```
ADMIN (exactly one, bootstrapped with the secret setup code)
 └── MISSIONARY
      ├── DEVOTEE … (10s of devotees per missionary)
      └── MISSIONARY            ← missionaries can appoint sub-missionaries
           ├── DEVOTEE …
           └── MISSIONARY …     ← arbitrary depth
```

- Implemented as `User.mentorId` self-relation; traversal via recursive CTE (`src/lib/hierarchy.ts`).
- **Access rule:** every superior can see everything in their subtree (attendance, follow-ups, reports, sadhana). Admin sees all. Enforced per-row in every API/page via `visibleUserIds()` / `canAccessUser()`.
- Cycle protection on mentor reassignment (`wouldCreateCycle`).

## Auth design

- No middleware/proxy — **server-layout guards** (`requireRole`) + **API guards** (`requireApiUser`) re-check role AND status against the DB on every request.
- Admin creation: one-time `/setup` screen, requires `ADMIN_SETUP_CODE` env (not hardcoded); refuses if an admin already exists.
- Devotees register via the public **application area** (`/apply`) → `User(status=PENDING)` + `Application(type=JOIN)`. Pending users may sign in but only see a status screen until approved.
- Approval assigns mentor + starting sadhana level.

## Sadhana levels (seeded from bhaktisteps.com)

1. Sraddhavan · 2. Krishna Sevaka · 3. Krishna Sadhaka · 4. Srila Prabhupada Asraya · 5. Sri Guru Carana Asraya

Each level: Standards, Recommended (Songs / Practices / Books / Additional Books), official application-form PDF link, certificate template link. Stored in `SadhanaLevel.sections` (JSON), seeded by `prisma/seed.ts` from `prisma/data/sadhana-levels.json`. Admin tags devotees with levels (audited in `LevelHistory`); devotees apply to advance (`Application(type=LEVEL_CHANGE)`).

## Core flows

| Flow | Model(s) | Notes |
|------|----------|-------|
| Application area | `Application` | JOIN + LEVEL_CHANGE, review with note, mentor+level assignment on approval |
| Attendance | `ClassSession` → `Attendance` | Slide-to-mark UI per devotee; A (present) + S (siksha level snapshot) per the Bhakti Vriksha weekly register; CSV download + printable register |
| Follow-ups | `FollowUp` | Every call/WhatsApp/email/SMS/home-visit logged per devotee, optionally linked to the missed session; reportable + downloadable |
| Reports | `ProgressReport` | Missionary daily/weekly update to superior with the EFFORTS counters (mails, calls, home visits, service donors, money donors) prefilled from follow-up logs |
| Sadhana journal | `SadhanaEntry` | Date-keyed upsert: japa rounds, reading minutes, aratis, lecture; streaks + weekly stats; mentors see mentees' consistency |

## Register export (matches the paper form)

“Bhakti Vriksha Group Weekly Report Format”: rows = devotee names; columns = Weeks 1–5 each with **A** (attendance) and **S** (siksha level), plus Remarks; followed by the EFFORTS table (5 weekly counters + totals). Generated per missionary per month from `Attendance` + `ProgressReport`; available as CSV and printable page.

## Conventions

- Next 16: `params`/`searchParams` are **Promises** — always `await`; `cookies()`/`headers()` async.
- All inputs validated with zod (`src/lib/validators.ts`); mutations via API route handlers under `/api`.
- Every list endpoint filters by `visibleUserIds(actor)` — never trust client-sent scope.
- UI primitives in `src/components/ui.tsx`; shell + nav in `src/components/app-shell.tsx`.
- Dev DB: `docker compose -f docker-compose.dev.yml up -d` (port 5433), `npm run db:migrate`, `npm run db:seed`.

## Route map

- Public: `/` (landing), `/login`, `/apply`, `/setup` (one-time), `/pending`
- `/admin`: dashboard, devotees (list/detail/tag/assign), hierarchy tree, applications, sessions, reports, levels
- `/missionary`: dashboard, my group, sessions + attendance marking, follow-ups, reports (own + subtree)
- `/devotee`: home, sadhana journal, my level (standards/recommended), my attendance, apply
