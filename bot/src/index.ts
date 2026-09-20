import { GrammyError } from "grammy";
import { createBot } from "./bot";

const bot = createBot();

// grammY relança (em vez de tentar de novo indefinidamente) erros 401/409 de
// getUpdates — 409 especificamente significa que já existe outra instância
// fazendo long polling com esse mesmo TELEGRAM_BOT_TOKEN (produção e local
// nunca podem rodar ao mesmo tempo com o mesmo token). Sem esse catch, essa
// rejeição some como unhandled rejection e derruba o processo com um stack
// trace ilegível em vez de uma mensagem clara.
bot.start({
	onStart: () => console.log("🤖 Bot do Telegram rodando (long polling)..."),
}).catch((error: unknown) => {
	if (error instanceof GrammyError && error.error_code === 409) {
		console.error(
			"🤖 Bot do Telegram não conseguiu iniciar: outra instância já está fazendo long polling com este TELEGRAM_BOT_TOKEN. Pare a outra instância (ex: produção no Railway) antes de rodar o bot localmente, ou use um bot de teste separado (@BotFather > /newbot) para desenvolvimento.",
		);
		process.exit(1);
	}
	if (error instanceof GrammyError && error.error_code === 401) {
		console.error("🤖 Bot do Telegram não conseguiu iniciar: TELEGRAM_BOT_TOKEN inválido ou revogado.");
		process.exit(1);
	}
	throw error;
});

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
