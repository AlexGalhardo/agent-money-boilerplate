-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "planStatus" TEXT NOT NULL DEFAULT 'inactive',
    "planExpiresAt" DATETIME,
    "telegramChatId" TEXT,
    "freeTransactionCount" INTEGER NOT NULL DEFAULT 0,
    "deletionRequestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_user" ("createdAt", "email", "emailVerified", "id", "image", "name", "planExpiresAt", "planStatus", "stripeCustomerId", "twoFactorEnabled", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "planExpiresAt", "planStatus", "stripeCustomerId", "twoFactorEnabled", "updatedAt" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_stripeCustomerId_key" ON "user"("stripeCustomerId");
CREATE UNIQUE INDEX "user_telegramChatId_key" ON "user"("telegramChatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
