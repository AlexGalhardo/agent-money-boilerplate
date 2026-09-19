-- CreateTable
CREATE TABLE "telegram_link_token" (
    "token" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_token_pkey" PRIMARY KEY ("token")
);
