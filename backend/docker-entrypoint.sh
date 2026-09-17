#!/bin/sh
# Gera o Prisma Client e aplica migrations no start do container -
# necessário porque o schema/cliente do Prisma é específico por
# provider (sqlite vs postgresql) e a mesma imagem serve os dois
# cenários dependendo de DATABASE_PROVIDER (ver backend/prisma7.config.ts).
set -e

bunx prisma migrate deploy
bunx prisma generate

exec bun run src/server.ts
