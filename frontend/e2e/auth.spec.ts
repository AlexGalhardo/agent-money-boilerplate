import { expect, test } from "@playwright/test";

test("a new user can sign up and lands on the dashboard", async ({ page }) => {
	const email = `e2e-${Date.now()}@example.com`;

	await page.goto("/criar-conta");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("Nome").fill("E2E Test User");
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha").fill("SenhaForte@123");
	await page.getByRole("button", { name: "Criar conta", exact: true }).click();

	await expect(page).toHaveURL(/\/dashboard/);
	await expect(page.getByText("Despesas por categoria")).toBeVisible();
});

test("shows an error for invalid login credentials", async ({ page }) => {
	await page.goto("/entrar");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill("nobody@example.com");
	await page.getByLabel("Senha").fill("wrong-password");
	await page.getByRole("button", { name: "Entrar", exact: true }).click();

	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/entrar/);
});

test("the seeded admin can log in and log out", async ({ page }) => {
	await page.goto("/entrar");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill("admin@gmail.com");
	await page.getByLabel("Senha").fill("adminBR@123");
	await page.getByRole("button", { name: "Entrar", exact: true }).click();

	await expect(page).toHaveURL(/\/dashboard/);

	await page.getByRole("button", { name: "Sair" }).click();
	await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
});

test("protected routes redirect to login when signed out", async ({ page }) => {
	await page.goto("/dashboard");
	await expect(page).toHaveURL(/\/entrar/);

	await page.goto("/minha-conta");
	await expect(page).toHaveURL(/\/entrar/);

	await page.goto("/checkout");
	await expect(page).toHaveURL(/\/entrar/);
});

test("public-only routes redirect an authenticated user to the dashboard", async ({ page }) => {
	await page.goto("/entrar");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill("admin@gmail.com");
	await page.getByLabel("Senha").fill("adminBR@123");
	await page.getByRole("button", { name: "Entrar", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard/);

	for (const path of ["/", "/entrar", "/criar-conta", "/esqueci-senha", "/resetar-senha"]) {
		await page.goto(path);
		await expect(page).toHaveURL(/\/dashboard/);
	}
});
