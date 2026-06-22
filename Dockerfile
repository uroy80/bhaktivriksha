# Production image for Sadhana Companion (Next.js 16 + Prisma + Postgres).
# Single-stage full build so the runtime also has the Prisma CLI + tsx for
# migrations and seeding via the entrypoint.
FROM node:20-slim

# Prisma needs openssl
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install deps (incl. dev: needed for `next build`, prisma CLI, tsx)
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
COPY . .
RUN npx prisma generate && npm run build

# Runtime
ENV NODE_ENV=production
EXPOSE 3000
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
