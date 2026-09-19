-- CreateTable
CREATE TABLE "telegram_link_token" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
