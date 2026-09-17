import { prisma } from "../src/config/prisma";
import { auth } from "../src/lib/auth";
import { encrypt } from "../src/lib/encryption";
import { transactionCategories, transactionTypes } from "../src/modules/transactions/transaction.schema";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "adminBR@123";
const TRANSACTIONS_COUNT = 500;

// Usuário real do dono do projeto, para subir localmente e usar o app com
// seus próprios dados (ex: botão "Importar" com o extrato do Nubank), sem
// as 500 transações fake geradas para o admin de demonstração/e2e.
const PERSONAL_EMAIL = "aleexgvieira@gmail.com";
const PERSONAL_PASSWORD = "galhardyn";
const PERSONAL_NAME = "Alex Galhardo Vieira";

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
		throw new Error("randomFrom chamado com array vazio");
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
		console.log(`Usuário admin já existe (${ADMIN_EMAIL}), reaproveitando.`);
		return existing.id;
	}

	const result = await auth.api.signUpEmail({
		body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: "Admin" },
	});

	await prisma.user.update({
		where: { id: result.user.id },
		// Conta de demonstração/E2E com plano ativo "para sempre" — sem isso, o
		// limite de 10 transações do plano gratuito (Fase 6) bloquearia as 500
		// transações de seed e os testes E2E que criam transações via esta conta.
		data: {
			emailVerified: true,
			planStatus: "active",
			planExpiresAt: new Date("2099-12-31T00:00:00.000Z"),
		},
	});

	console.log(`Usuário admin criado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
	return result.user.id;
}

async function seedTransactions(userId: string): Promise<void> {
	const existingCount = await prisma.transaction.count({ where: { userId } });

	if (existingCount > 0) {
		console.log(`Usuário admin já tem ${existingCount} transações, pulando geração de seed.`);
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
		const amount = Math.floor(Math.random() * 490_00) + 10_00; // 10.00 a 500.00

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
	console.log(`${TRANSACTIONS_COUNT} transações geradas para o usuário admin.`);
}

async function seedPersonalUser(): Promise<void> {
	const existing = await prisma.user.findUnique({ where: { email: PERSONAL_EMAIL } });

	if (existing) {
		console.log(`Usuário pessoal já existe (${PERSONAL_EMAIL}), reaproveitando.`);
		return;
	}

	const result = await auth.api.signUpEmail({
		body: { email: PERSONAL_EMAIL, password: PERSONAL_PASSWORD, name: PERSONAL_NAME },
	});

	await prisma.user.update({
		where: { id: result.user.id },
		data: { emailVerified: true },
	});

	console.log(`Usuário pessoal criado: ${PERSONAL_EMAIL} / ${PERSONAL_PASSWORD} (sem transações de exemplo).`);
}

async function main(): Promise<void> {
	const adminId = await seedAdminUser();
	await seedTransactions(adminId);
	await seedPersonalUser();
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
