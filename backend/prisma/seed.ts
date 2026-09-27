import { env } from "../src/config/env";
import { prisma } from "../src/config/prisma";
import { auth } from "../src/lib/auth";
import { encrypt } from "../src/lib/encryption";
import { transactionCategories, transactionTypes } from "../src/modules/transactions/transaction.schema";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "adminBR@123";
const TRANSACTIONS_COUNT = 500;

// Optional personal account (no fake transactions) for using the app locally
// with your own data, e.g. importing a real bank statement. Credentials come
// from the environment — never hardcode real ones here (this file is public).
const personalAccount =
	Bun.env.SEED_PERSONAL_EMAIL && Bun.env.SEED_PERSONAL_PASSWORD
		? {
				email: Bun.env.SEED_PERSONAL_EMAIL,
				password: Bun.env.SEED_PERSONAL_PASSWORD,
				name: Bun.env.SEED_PERSONAL_NAME ?? "Personal",
			}
		: null;

const descriptionsByCategory: Record<(typeof transactionCategories)[number], string[]> = {
	food: ["Supermercado", "Restaurante", "iFood", "Padaria", "Feira"],
	transport: ["Uber", "Combustível", "Metrô", "Estacionamento", "Manutenção do carro"],
	housing: ["Aluguel", "Condomínio", "Energia elétrica", "Água", "Internet"],
	health: ["Farmácia", "Plano de saúde", "Consulta médica", "Academia"],
	education: ["Curso online", "Livros", "Mensalidade faculdade"],
	entertainment: ["Cinema", "Streaming", "Show", "Jogos"],
	shopping: ["Roupas", "Eletrônicos", "Presente"],
	salary: ["Salário mensal", "Décimo terceiro", "Bônus"],
	investment: ["Aporte em ações", "Renda fixa", "Dividendos recebidos"],
	rental_income: ["Aluguel recebido"],
	extra_income: ["Venda de item usado", "Cashback"],
	freelancer: ["Projeto freelancer", "Consultoria", "Trabalho extra"],
	gifts: ["Presente recebido"],
	prizes: ["Prêmio de sorteio", "Bônus de indicação"],
	transfers: ["Pix enviado", "Pix recebido"],
	credit_card_bill: ["Pagamento de fatura"],
	insurance: ["Seguro de vida", "Seguro residencial", "Seguro veicular"],
	other: ["Doação", "Taxa bancária", "Diversos"],
};

function randomFrom<T>(items: readonly T[]): T {
	const item = items[Math.floor(Math.random() * items.length)];
	if (item === undefined) {
		throw new Error("randomFrom called with an empty array");
	}
	return item;
}

function randomDateWithinLastYear(): Date {
	const now = Date.now();
	const oneYearMs = 365 * 24 * 60 * 60 * 1000;
	return new Date(now - Math.floor(Math.random() * oneYearMs));
}

async function seedAdminUser(): Promise<string> {
	const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

	if (existing) {
		console.log(`Admin user already exists (${ADMIN_EMAIL}), reusing it.`);
		return existing.id;
	}

	const result = await auth.api.signUpEmail({
		body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: "Admin" },
	});

	await prisma.user.update({
		where: { id: result.user.id },
		// Demo/E2E account on a "forever" active plan — otherwise the free plan's
		// 10-transaction limit would block the 500 seeded transactions and the
		// E2E tests that create transactions through this account.
		data: {
			emailVerified: true,
			planStatus: "active",
			planExpiresAt: new Date("2099-12-31T00:00:00.000Z"),
		},
	});

	console.log(`Admin user created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
	return result.user.id;
}

async function seedTransactions(userId: string): Promise<void> {
	const existingCount = await prisma.transaction.count({ where: { userId } });

	if (existingCount > 0) {
		console.log(`Admin user already has ${existingCount} transactions, skipping.`);
		return;
	}

	const data = Array.from({ length: TRANSACTIONS_COUNT }, () => {
		const category = randomFrom(transactionCategories);
		const type =
			category === "salary" ||
			category === "investment" ||
			category === "rental_income" ||
			category === "extra_income" ||
			category === "gifts" ||
			category === "prizes"
				? "income"
				: category === "credit_card_bill" || category === "insurance"
					? "expense"
					: randomFrom(transactionTypes);
		const description = randomFrom(descriptionsByCategory[category]);
		const amount = Math.floor(Math.random() * 490_00) + 10_00; // 10.00 to 500.00

		return {
			userId,
			description: encrypt(description),
			amount: encrypt(String(amount)),
			category,
			type,
			date: randomDateWithinLastYear(),
		};
	});

	await prisma.transaction.createMany({ data });
	console.log(`${TRANSACTIONS_COUNT} transactions generated for the admin user.`);
}

async function seedPersonalUser(account: { email: string; password: string; name: string }): Promise<void> {
	const existing = await prisma.user.findUnique({ where: { email: account.email } });

	if (existing) {
		console.log(`Personal user already exists (${account.email}), reusing it.`);
		return;
	}

	const result = await auth.api.signUpEmail({ body: account });
	await prisma.user.update({ where: { id: result.user.id }, data: { emailVerified: true } });

	console.log(`Personal user created: ${account.email} (no sample transactions).`);
}

async function main(): Promise<void> {
	// The demo admin's password is public (README, E2E suites) — seeding it
	// into a production database would hand out a working account.
	if (env.NODE_ENV === "production") {
		throw new Error("Refusing to seed with NODE_ENV=production.");
	}

	const adminId = await seedAdminUser();
	await seedTransactions(adminId);
	if (personalAccount) await seedPersonalUser(personalAccount);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
