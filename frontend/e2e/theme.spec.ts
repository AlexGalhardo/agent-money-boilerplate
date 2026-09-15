import { expect, test } from "@playwright/test";

test("toggling the theme switches to dark mode and persists across reload", async ({ page }) => {
	await page.goto("/");
	await page.waitForLoadState("networkidle");

	const html = page.locator("html");
	const toggle = page.getByRole("button", { name: /ativar tema/i });

	const initiallyDark = await html.evaluate((el) => el.classList.contains("dark"));

	await toggle.click();
	await expect(html).toHaveClass(initiallyDark ? /^(?!.*dark).*$/ : /dark/);

	await page.reload();
	await expect(html).toHaveClass(initiallyDark ? /^(?!.*dark).*$/ : /dark/);
});
