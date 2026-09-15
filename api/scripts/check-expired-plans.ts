import { prisma } from "../src/config/prisma";
import { paymentService } from "../src/modules/payments/payment.service";

/**
 * Script standalone para cron em VPS/Docker (fora do contexto Vercel Cron,
 * que usa a rota POST /cron/check-expired-plans). Uso sugerido no crontab:
 * `0 3 * * * cd /path/to/api && bun run scripts/check-expired-plans.ts`
 */
async function main(): Promise<void> {
	const updated = await paymentService.checkExpiredPlans();
	console.log(`${updated} usuário(s) com plano marcado como expirado.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
