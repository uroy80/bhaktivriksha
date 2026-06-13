# 🪷 Sadhana Companion

Industry-grade temple management platform for the Bhakti Vriksha program — **Phase 1: DRM (Devotee Relationship Management) + Sadhana Companion**, interconnected.

Future phases: book stock management, book purchase website, main temple website.

## What it does

- **One Admin** (bootstrapped via a secret setup code) oversees the whole temple.
- **Milkyway hierarchy**: admin assigns missionaries; each missionary shepherds n devotees and may appoint sub-missionaries — arbitrary depth. Every superior sees their entire subtree.
- **Sadhana levels** (from [bhaktisteps.com](https://bhaktisteps.com/sadhana-levels/)): Sraddhavan → Krishna Sevaka → Krishna Sadhaka → Srila Prabhupada Asraya → Sri Guru Carana Asraya, with full standards & recommended practices. Admin tags devotees; devotees apply to advance.
- **Application area**: newcomers apply to join; existing devotees apply for level advancement; admin reviews with mentor + level assignment.
- **Attendance**: missionaries mark satsanga/class attendance with a slide-to-mark control; downloadable as CSV and as the printable **Bhakti Vriksha Group Weekly Report** register (Weeks 1–5 × A/S + EFFORTS table).
- **Follow-ups**: every phone call / WhatsApp / email / SMS / home visit to an absent devotee is logged, reportable, downloadable.
- **Progress reports**: missionaries send daily/weekly updates (with effort counters) up the chain.
- **Sadhana journal**: every devotee tracks japa, reading, aratis, lectures — streaks and consistency visible to their counsellor.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 6 · PostgreSQL · NextAuth v5

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Local development

```bash
npm install
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5433
cp .env.example .env                              # then fill values
npm run db:migrate                                # apply migrations
npm run db:seed                                   # seed the 5 sadhana levels
npx tsx scripts/dev-fixtures.ts                   # optional: rich test data
npm run dev
```

First run: open `/setup` to create the admin (requires `ADMIN_SETUP_CODE` from `.env`).

## Environment

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | NextAuth JWT secret (`openssl rand -base64 32`) |
| `ADMIN_SETUP_CODE` | Secret required by the one-time `/setup` screen |
