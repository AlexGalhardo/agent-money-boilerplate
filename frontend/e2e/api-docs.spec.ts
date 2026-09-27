import { expect, test } from "@playwright/test";

test("the /api page renders the Scalar reference from the backend's OpenAPI spec", async ({ page }) => {
	await page.goto("/entrar");
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill("admin@gmail.com");
	await page.getByLabel("Senha", { exact: true }).fill("adminBR@123");
	await page.getByRole("button", { name: "Entrar", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard/);

	await page.goto("/api");
	const reference = page.getByTestId("api-reference");
	await expect(reference.getByText("Agent Money API")).toBeVisible({ timeout: 15_000 });
	await expect(reference.getByText("Criar transação").first()).toBeVisible();
	await expect(reference.getByText("x-api-key").first()).toBeVisible();
});
