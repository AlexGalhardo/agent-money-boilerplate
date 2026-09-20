import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/entrar");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill("admin@gmail.com");
	await page.getByLabel("Senha", { exact: true }).fill("adminBR@123");
	await page.getByRole("button", { name: "Entrar", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard/);
});

test("dashboard shows the seeded transactions and charts", async ({ page }) => {
	await expect(page.getByText("Despesas por categoria")).toBeVisible();
	await expect(page.getByText("Receitas por categoria")).toBeVisible();
	await expect(page.getByRole("columnheader", { name: "Ações" })).toBeVisible();
	await expect(page.getByText(/Página 1 de \d+/)).toBeVisible();
});

test("filters the transaction list by search term", async ({ page }) => {
	const searchInput = page.getByLabel("Buscar por nome");
	await searchInput.fill("Uber");

	await expect(page.getByRole("row", { name: /Uber/ }).first()).toBeVisible();
	await expect(page.locator("tbody")).not.toContainText("Combustível");
});

test("creates, edits and deletes a transaction end to end", async ({ page }) => {
	await page.getByRole("button", { name: "Adicionar Despesa" }).click();
	await page.getByLabel("Descrição").fill("Compra E2E Playwright");
	await page.getByLabel("Valor").fill("77.50");
	await page.getByRole("button", { name: "Criar transação" }).click();

	// Entre 500 transações seedadas, a nova pode não cair na página 1 por ordem
	// de data — busca pelo nome para achá-la independente da posição.
	await page.getByLabel("Buscar por nome").fill("Playwright");

	const row = page.getByRole("row", { name: /COMPRA E2E PLAYWRIGHT/ });
	await expect(row).toBeVisible();
	await expect(row).toContainText("R$ 77,50");

	await row.getByRole("button", { name: "Editar" }).click();
	await page.getByLabel("Valor").fill("99.90");
	await page.getByRole("button", { name: "Salvar alterações" }).click();

	await expect(row).toContainText("R$ 99,90");

	await row.getByRole("button", { name: "Excluir" }).click();
	await page.getByRole("button", { name: "Confirmar exclusão" }).click();

	await expect(page.getByRole("row", { name: /COMPRA E2E PLAYWRIGHT/ })).toHaveCount(0);
});

test("adding an income transaction shows it with a green plus sign", async ({ page }) => {
	await page.getByRole("button", { name: "Adicionar Receita" }).click();
	await page.getByLabel("Descrição").fill("Bonus E2E Playwright");
	await page.getByLabel("Valor").fill("500.00");
	await page.getByRole("button", { name: "Criar transação" }).click();

	await page.getByLabel("Buscar por nome").fill("Playwright");

	const row = page.getByRole("row", { name: /BONUS E2E PLAYWRIGHT/ });
	await expect(row).toBeVisible();
	await expect(row).toContainText("+");
	await expect(row).toContainText("R$ 500,00");

	await row.getByRole("button", { name: "Excluir" }).click();
	await page.getByRole("button", { name: "Confirmar exclusão" }).click();
	await expect(page.getByRole("row", { name: /BONUS E2E PLAYWRIGHT/ })).toHaveCount(0);
});

test("exports the transaction list to xlsx and csv", async ({ page }) => {
	const xlsxDownload = page.waitForEvent("download");
	await page.getByRole("button", { name: "Exportar .xlsx" }).click();
	expect((await xlsxDownload).suggestedFilename()).toBe("transacoes.xlsx");

	const csvDownload = page.waitForEvent("download");
	await page.getByRole("button", { name: "Exportar .csv" }).click();
	expect((await csvDownload).suggestedFilename()).toBe("transacoes.csv");
});
