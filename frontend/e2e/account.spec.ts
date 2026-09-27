import { expect, test } from "@playwright/test";

async function signUp(page: import("@playwright/test").Page): Promise<string> {
	const email = `e2e-account-${Date.now()}@example.com`;
	await page.goto("/criar-conta");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("Nome").fill("Conta E2E");
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha", { exact: true }).fill("SenhaForte@123");
	await page.getByRole("button", { name: "Criar conta", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	return email;
}

test("a free account shows the Gratuito plan and usage counter", async ({ page }) => {
	await signUp(page);

	await page.goto("/minha-conta");
	await expect(page.getByText("Gratuito")).toBeVisible();
	await expect(page.getByText("0/10 transações utilizadas")).toBeVisible();
});

test("never offers a Telegram chat ID field — linking only happens from the bot", async ({ page }) => {
	await signUp(page);

	await page.goto("/minha-conta");
	await expect(page.getByText("Nenhum chat vinculado.", { exact: false })).toBeVisible();
	await expect(page.getByLabel("Chat ID do Telegram")).toHaveCount(0);
});

test("delete account modal shows the 10 second cooldown for free plan users", async ({ page }) => {
	await signUp(page);

	await page.goto("/minha-conta");
	await page.getByRole("button", { name: "Excluir minha conta" }).click();

	await expect(page.getByRole("button", { name: /segundos para confirmar exclusão de conta/ })).toBeDisabled();
});

test("dashboard disables add/import/export buttons once the free plan limit is reached", async ({ page }) => {
	await signUp(page);

	for (let i = 0; i < 10; i++) {
		const response = await page.request.post("http://localhost:4200/transactions", {
			data: { description: "TESTE LIMITE", amount: 100, category: "other", type: "expense" },
		});
		expect(response.ok()).toBe(true);
	}

	await page.goto("/dashboard");
	await expect(page.getByText(/Limite de 10 transações do plano gratuito atingido/)).toBeVisible();
	await expect(page.getByRole("button", { name: "Adicionar Despesa" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Adicionar Receita" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Importar" })).toBeDisabled();
});
