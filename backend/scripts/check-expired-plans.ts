import { prisma } from "../src/config/prisma";
import { paymentService } from "../src/modules/payments/payment.service";

/**
 * Standalone cron entrypoint for VPS/Docker (outside Vercel Cron, which calls
 * GET /cron/check-expired-plans). Suggested crontab line:
 * `0 3 * * * cd /path/to/backend && bun run scripts/check-expired-plans.ts`
 */
async function main(): Promise<void> {
	const updated = await paymentService.checkExpiredPlans();
	console.log(`${updated} user(s) marked as expired.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
