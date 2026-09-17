#!/bin/sh
# O bot usa o Prisma Client gerado dentro de backend/prisma/generated (mesmo
# schema, mesmo banco da API) — precisa ser gerado no filesystem deste
# container também, já que cada serviço do compose tem seu próprio
# filesystem (só o banco é compartilhado, via volume).
set -e

(cd ../backend && bunx prisma generate)

exec bun run src/index.ts
