/*
  Warnings:

  - You are about to drop the column `stripeEventId` on the `payment_log` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `user` table. All the data in the column will be lost.
  - Added the required column `externalId` to the `payment_log` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "pix_charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "brCode" TEXT NOT NULL,
    "brCodeBase64" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pix_charge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payment_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT,
    "rawPayload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payment_log" ("amount", "createdAt", "currency", "eventType", "id", "rawPayload", "status", "userId") SELECT "amount", "createdAt", "currency", "eventType", "id", "rawPayload", "status", "userId" FROM "payment_log";
DROP TABLE "payment_log";
ALTER TABLE "new_payment_log" RENAME TO "payment_log";
CREATE UNIQUE INDEX "payment_log_externalId_key" ON "payment_log"("externalId");
CREATE INDEX "payment_log_userId_idx" ON "payment_log"("userId");
CREATE TABLE "new_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "planStatus" TEXT NOT NULL DEFAULT 'inactive',
    "planExpiresAt" DATETIME,
    "telegramChatId" TEXT,
    "freeTransactionCount" INTEGER NOT NULL DEFAULT 0,
    "deletionRequestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_user" ("createdAt", "deletionRequestedAt", "email", "emailVerified", "freeTransactionCount", "id", "image", "name", "planExpiresAt", "planStatus", "telegramChatId", "twoFactorEnabled", "updatedAt") SELECT "createdAt", "deletionRequestedAt", "email", "emailVerified", "freeTransactionCount", "id", "image", "name", "planExpiresAt", "planStatus", "telegramChatId", "twoFactorEnabled", "updatedAt" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_telegramChatId_key" ON "user"("telegramChatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pix_charge_externalId_key" ON "pix_charge"("externalId");

-- CreateIndex
CREATE INDEX "pix_charge_userId_idx" ON "pix_charge"("userId");
