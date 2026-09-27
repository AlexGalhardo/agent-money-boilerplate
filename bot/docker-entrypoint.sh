#!/bin/sh
# The bot uses the Prisma Client generated inside backend/prisma/generated
# (same schema and database as the API) — it has to be generated in this
# container's filesystem too, since each compose service has its own
# filesystem (only the database is shared, through a volume).
set -e

(cd ../backend && bunx prisma generate)

exec bun run src/index.ts
