#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Seeding sadhana levels (idempotent)..."
npx prisma db seed

echo "[entrypoint] Starting Next.js on :3000 ..."
exec npm run start -- -p 3000 -H 0.0.0.0
