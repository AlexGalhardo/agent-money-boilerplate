import { expect, test } from "@playwright/test";

test("landing page shows the hero and links to institutional pages", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: /suas finanças/i })).toBeVisible();
	await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();

	await page.getByRole("link", { name: "Termos de uso" }).click();
	await expect(page).toHaveURL(/\/termos-de-uso/);
	await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible();

	await page.goto("/politica-de-privacidade");
	await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();

	await page.goto("/contato");
	await expect(page.getByRole("heading", { name: "Entre em Contato" })).toBeVisible();
});

test("contact form validates required fields before submitting", async ({ page }) => {
	await page.goto("/contato");
	await page.waitForLoadState("networkidle");

	await page.getByRole("button", { name: "Enviar mensagem" }).click();

	await expect(page.getByText("Informe seu nome")).toBeVisible();
	await expect(page.getByText("E-mail inválido")).toBeVisible();
	await expect(page.locator("#subject-error")).toHaveText("Selecione um assunto");
});

test("contact form shows a live character counter capped at 512 and submits successfully", async ({ page }) => {
	await page.goto("/contato");
	await page.waitForLoadState("networkidle");

	await expect(page.getByText("0/512")).toBeVisible();

	await page.getByLabel("Nome").fill("Visitante");
	await page.getByLabel("E-mail").fill("visitante@example.com");
	await page.getByLabel("Assunto").selectOption("bugs");
	await page.getByLabel("Mensagem").fill("Encontrei um problema técnico ao tentar exportar minhas transações.");

	await expect(page.getByText(/^\d+\/512$/)).toBeVisible();
	await expect(page.getByText("0/512")).not.toBeVisible();

	await page.getByRole("button", { name: "Enviar mensagem" }).click();
	await expect(page.getByRole("status")).toHaveText(/Mensagem enviada com sucesso/);
});

test("pre-fills and disables name/email for a logged-in user", async ({ page }) => {
	await page.goto("/entrar");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill("admin@gmail.com");
	await page.getByLabel("Senha", { exact: true }).fill("adminBR@123");
	await page.getByRole("button", { name: "Entrar", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard/);

	await page.goto("/contato");
	await expect(page.getByLabel("Nome")).toHaveValue("Admin");
	await expect(page.getByLabel("Nome")).toHaveAttribute("readonly", "");
	await expect(page.getByLabel("E-mail")).toHaveValue("admin@gmail.com");
	await expect(page.getByLabel("E-mail")).toHaveAttribute("readonly", "");
});
