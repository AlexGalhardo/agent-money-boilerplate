import { createBot } from "./bot";

const bot = createBot();

bot.start();
console.log("🤖 Bot do Telegram rodando (long polling)...");

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
