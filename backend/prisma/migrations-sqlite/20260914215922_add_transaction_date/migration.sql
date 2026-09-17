-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_transaction" ("amount", "category", "createdAt", "description", "id", "type", "updatedAt", "userId") SELECT "amount", "category", "createdAt", "description", "id", "type", "updatedAt", "userId" FROM "transaction";
DROP TABLE "transaction";
ALTER TABLE "new_transaction" RENAME TO "transaction";
CREATE INDEX "transaction_userId_idx" ON "transaction"("userId");
CREATE INDEX "transaction_userId_category_idx" ON "transaction"("userId", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
