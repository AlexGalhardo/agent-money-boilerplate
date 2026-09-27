import { GrammyError } from "grammy";
import { createBot } from "./bot";

const bot = createBot();

// grammY rethrows (instead of retrying forever) 401/409 errors from
// getUpdates — 409 means another instance is already long polling with this
// TELEGRAM_BOT_TOKEN (production and local can never run at the same time
// with the same token). Without this catch, the rejection surfaces as an
// unhandled rejection with an unreadable stack trace.
bot.start({
	onStart: () => console.log("🤖 Telegram bot running (long polling)..."),
}).catch((error: unknown) => {
	if (error instanceof GrammyError && error.error_code === 409) {
		console.error(
			"🤖 Telegram bot failed to start: another instance is already long polling with this TELEGRAM_BOT_TOKEN. Stop it (e.g. production on Railway) before running locally, or create a separate test bot (@BotFather > /newbot) for development.",
		);
		process.exit(1);
	}
	if (error instanceof GrammyError && error.error_code === 401) {
		console.error("🤖 Telegram bot failed to start: TELEGRAM_BOT_TOKEN is invalid or revoked.");
		process.exit(1);
	}
	throw error;
});

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
