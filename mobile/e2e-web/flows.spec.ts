import { expect, type Locator, type Page, test } from "@playwright/test";

// The web stack keeps previous screens mounted (hidden) in the DOM, so every
// lookup is scoped to what is actually on screen.
function visible(locator: Locator): Locator {
	return locator.filter({ visible: true });
}

const API_URL = "http://localhost:4210";

async function logIn(page: Page, email: string, password: string): Promise<void> {
	await page.goto("/login");
	await visible(page.getByTestId("field-E-mail")).fill(email);
	await visible(page.getByTestId("field-Senha")).fill(password);
	await visible(page.getByRole("button", { name: "Entrar", exact: true })).click();
}

test("a new user signs up and lands on the dashboard", async ({ page }) => {
	await page.goto("/login");
	await visible(page.getByText("Criar conta", { exact: true })).click();

	await visible(page.getByTestId("field-Nome")).fill("maestro");
	await visible(page.getByTestId("field-E-mail")).fill(`mobile-e2e-${Date.now()}@example.com`);
	await visible(page.getByTestId("field-Senha")).fill("SenhaForte@123");
	await visible(page.getByRole("button", { name: "Criar conta", exact: true })).click();

	await expect(visible(page.getByText("Olá, Maestro"))).toBeVisible();
	await expect(visible(page.getByText("Nenhuma transação"))).toBeVisible();
});

test("shows an inline error for wrong credentials", async ({ page }) => {
	await logIn(page, "admin@gmail.com", "wrong-password");
	await expect(visible(page.getByRole("alert"))).toContainText("incorret");
	await expect(page).toHaveURL(/\/login/);
});

test("sign-up stays disabled until every field is filled and shows the password rules", async ({ page }) => {
	await page.goto("/signup");
	const submit = visible(page.getByRole("button", { name: "Criar conta", exact: true }));

	await visible(page.getByTestId("field-Senha")).fill("abc");
	await expect(visible(page.getByText("Uma letra maiúscula (A-Z)"))).toBeVisible();
	await expect(submit).toBeDisabled();

	await visible(page.getByTestId("field-Nome")).fill("Maria");
	await visible(page.getByTestId("field-E-mail")).fill("maria@example.com");
	await visible(page.getByTestId("field-Senha")).fill("Abcdef1!");
	await expect(submit).toBeEnabled();
});

test("creates, finds and edits a transaction", async ({ page }) => {
	const description = `Mobile E2E ${Date.now()}`;
	await logIn(page, "admin@gmail.com", "adminBR@123");
	await expect(visible(page.getByText("Olá, Admin"))).toBeVisible();

	await visible(page.getByTestId("nav-new-transaction")).click();
	await expect(visible(page.getByText("Nova transação"))).toBeVisible();
	await visible(page.getByTestId("field-Valor")).fill("4321");
	await visible(page.getByTestId("field-Descrição")).fill(description);
	await visible(page.getByRole("button", { name: "Compras" })).click();
	await visible(page.getByRole("button", { name: "Adicionar" })).click();
	await expect(visible(page.getByText("Olá, Admin"))).toBeVisible();

	await visible(page.getByTestId("nav-search")).click();
	await visible(page.getByTestId("search-input")).fill(description);
	await expect(visible(page.getByText(description))).toBeVisible();
	await expect(visible(page.getByText("− R$ 43,21"))).toBeVisible();

	await visible(page.getByText(description)).click();
	await expect(visible(page.getByText("Editar transação"))).toBeVisible();
	await expect(visible(page.getByTestId("field-Valor"))).toHaveValue("43,21");
	await visible(page.getByTestId("field-Valor")).fill("9999");
	await visible(page.getByRole("button", { name: "Salvar alterações" })).click();
	await expect(visible(page.getByText("− R$ 99,99"))).toBeVisible();

	// Deleting goes through a native Alert (a no-op on web) — covered by
	// maestro/transaction-crud.yaml; clean up through the API instead.
	const cookies = await page.context().cookies(API_URL);
	const list = await page.request.get(`${API_URL}/transactions?search=${encodeURIComponent(description)}`, {
		headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
	});
	const { transactions } = (await list.json()) as { transactions: { id: string }[] };
	for (const { id } of transactions) {
		await page.request.delete(`${API_URL}/transactions/${id}`, {
			headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
		});
	}
});

test("profile shows the plan and never offers a chat ID field", async ({ page }) => {
	await logIn(page, "admin@gmail.com", "adminBR@123");
	await visible(page.getByTestId("nav-profile")).click();

	await expect(visible(page.getByRole("heading", { name: "Minha Conta" }))).toBeVisible();
	await expect(visible(page.getByText(/^PRO/))).toBeVisible();
	await expect(visible(page.getByText("Não vinculado"))).toBeVisible();
	await expect(visible(page.getByTestId("field-Chat ID do Telegram"))).toHaveCount(0);
});

test("dashboard filters by category and switches the chart", async ({ page }) => {
	await logIn(page, "admin@gmail.com", "adminBR@123");
	await expect(visible(page.getByText("500 no total"))).toBeVisible();

	await visible(page.getByRole("button", { name: "Seguro", exact: true })).click();
	await expect(visible(page.getByText("Saldo no filtro"))).toBeVisible();
	await expect(visible(page.getByText("500 no total"))).toHaveCount(0);

	await visible(page.getByRole("tab", { name: "Receitas" })).click();
	await expect(visible(page.getByRole("tab", { name: "Receitas" }))).toHaveAttribute("aria-selected", "true");
});
