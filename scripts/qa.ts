// Global QA / pentest pass: behaves like a human tester on every app —
// visits every screen, clicks the controls, runs the main flows — and probes
// the API with hostile input (SQL injection, XSS, IDOR, mass assignment,
// auth bypass, CORS, secrets on cron/webhooks). Every check prints
// PASS/FAIL; --report writes a markdown checklist. Exit code 1 on any FAIL.
//
//   bun scripts/qa.ts [--start] [--only api,web,desktop,bot,android]
//                     [--api URL] [--web URL] [--avd NAME] [--headless]
//                     [--report qa-report.md] [--shots qa-shots]
//
// --start  boots an isolated stack on a freshly seeded throwaway database
//          (backend/e2e.db): API :4400, web :4401. Without it the script
//          tests what is already running at --api/--web (defaults: the
//          `bun run dev:all` ports) and only creates throwaway users there.
// android  drives the real native app inside the Android emulator (Expo Go,
//          adb + uiautomator, no extra tooling): it boots an AVD from the
//          local Android SDK (creating `agent-money-qa` if none exists),
//          installs Expo Go, starts Metro on :8091 and taps through the app.
//          Skipped (not failed) when no Android SDK is found, e.g. in CI.
// bot      runs the Telegram bot in-process against a fake Telegram API and
//          the seeded database — needs backend/e2e.db (created by --start).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { _electron, type Browser, chromium, type Locator, type Page } from "@playwright/test";
import type { Subprocess } from "bun";

const ROOT = join(import.meta.dir, "..");
const args = process.argv.slice(2);
const argValue = (name: string, fallback: string): string => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
};
const START = args.includes("--start");
const HEADLESS = args.includes("--headless") || Boolean(process.env.CI);
const API = argValue("api", START ? "http://localhost:4400" : "http://localhost:4000");
const WEB = argValue("web", START ? "http://localhost:4401" : "http://localhost:4001");
const ALL_GROUPS = ["api", "web", "desktop", "bot", "android"];
const ONLY = argValue("only", ALL_GROUPS.join(","))
	.split(",")
	.map((group) => group.trim())
	.filter(Boolean);
const REPORT = argValue("report", "");
const SHOTS = argValue("shots", "");
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const ADMIN = { email: "admin@gmail.com", password: "adminBR@123" };
const STRONG_PASSWORD = "SenhaForte@123";
const RUN_ID = Date.now().toString(36);

// ── results ──────────────────────────────────────────────────────────────────

interface Result {
	group: string;
	name: string;
	status: "pass" | "fail" | "skip";
	info: string;
}
const results: Result[] = [];

function check(group: string, name: string, ok: boolean, info = ""): boolean {
	results.push({ group, name, status: ok ? "pass" : "fail", info });
	console.log(`${ok ? "PASS" : "FAIL"} [${group}] ${name}${info ? ` — ${info}` : ""}`);
	return ok;
}

function skip(group: string, reason: string): void {
	results.push({ group, name: "group skipped", status: "skip", info: reason });
	console.log(`SKIP [${group}] ${reason}`);
}

async function group(name: string, body: () => Promise<void>): Promise<void> {
	if (!ONLY.includes(name)) return;
	console.log(`\n── ${name} ${"─".repeat(60 - name.length)}`);
	try {
		await body();
	} catch (error) {
		check(name, "group finished without an unexpected exception", false, String(error).slice(0, 300));
	}
}

// ── processes ────────────────────────────────────────────────────────────────

const children: Subprocess[] = [];

function spawn(cmd: string[], cwd: string, env: Record<string, string> = {}): Subprocess {
	const child = Bun.spawn(cmd, {
		cwd: join(ROOT, cwd),
		env: { ...process.env, ...env },
		stdout: "ignore",
		stderr: "ignore",
	});
	children.push(child);
	return child;
}

function stopChildren(): void {
	for (const child of children) {
		if (child.exitCode !== null) continue;
		// `bun run`/`bunx` keep the real server as a grandchild; on Windows only
		// a tree kill frees the port.
		if (process.platform === "win32") Bun.spawnSync(["taskkill", "/pid", String(child.pid), "/T", "/F"]);
		else child.kill();
	}
}
process.on("SIGINT", () => {
	stopChildren();
	process.exit(130);
});

async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fetch(url, { signal: AbortSignal.timeout(3000) });
			return true;
		} catch {
			await Bun.sleep(1000);
		}
	}
	return false;
}

async function startStack(): Promise<void> {
	console.log("Seeding backend/e2e.db and starting API :4400 + web :4401…");
	const setup = Bun.spawnSync(["bun", "run", "test:e2e:setup"], { cwd: join(ROOT, "backend") });
	if (setup.exitCode !== 0) throw new Error(`test:e2e:setup failed:\n${setup.stderr.toString().slice(-2000)}`);
	spawn(["bun", "--env-file=.env.e2e", "run", "src/server.ts"], "backend", {
		PORT: "4400",
		APP_URL: API,
		FRONTEND_URL: WEB,
	});
	spawn(["bunx", "vite", "dev", "--port", "4401", "--strictPort", "--mode", "e2e"], "frontend", {
		VITE_API_URL: API,
	});
	if (!(await waitForUrl(`${API}/`, 60_000))) throw new Error(`API did not start on ${API}`);
	if (!(await waitForUrl(WEB, 120_000))) throw new Error(`web did not start on ${WEB}`);
}

// ── API client with a cookie jar per user ────────────────────────────────────

const serverErrors: string[] = [];

class ApiUser {
	cookie = "";
	id = "";
	constructor(
		readonly email: string,
		readonly password = STRONG_PASSWORD,
	) {}

	async request(
		method: string,
		path: string,
		body?: unknown,
		headers: Record<string, string> = {},
	): Promise<{ status: number; json: Record<string, unknown>; headers: Headers; text: string }> {
		const response = await fetch(`${API}${path}`, {
			method,
			headers: {
				origin: WEB,
				...(body !== undefined && typeof body !== "string" ? { "content-type": "application/json" } : {}),
				...(this.cookie ? { cookie: this.cookie } : {}),
				...headers,
			},
			body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
			redirect: "manual",
		});
		const setCookies = response.headers.getSetCookie();
		if (setCookies.length) {
			const jar = new Map(
				this.cookie ? this.cookie.split("; ").map((c) => c.split("=", 2) as [string, string]) : [],
			);
			for (const raw of setCookies) {
				const [pair = ""] = raw.split(";");
				const [name = "", value = ""] = pair.split("=", 2);
				if (value) jar.set(name, value);
				else jar.delete(name);
			}
			this.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
		}
		const text = await response.text();
		if (response.status >= 500) serverErrors.push(`${method} ${path} → ${response.status}`);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(text) as Record<string, unknown>;
		} catch {}
		return { status: response.status, json, headers: response.headers, text };
	}

	async signUp(name = "QA Tester"): Promise<number> {
		const res = await this.request("POST", "/auth/sign-up/email", {
			name,
			email: this.email,
			password: this.password,
		});
		this.id = String((res.json.user as { id?: string } | undefined)?.id ?? "");
		return res.status;
	}

	async signIn(): Promise<number> {
		const res = await this.request("POST", "/auth/sign-in/email", { email: this.email, password: this.password });
		this.id = String((res.json.user as { id?: string } | undefined)?.id ?? "");
		return res.status;
	}
}

type Tx = { id: string; description: string; amount: number };
const newTx = (description: string, amount = 1234): Record<string, unknown> => ({
	description,
	amount,
	category: "food",
	type: "expense",
});

// ── api: functional + pentest ────────────────────────────────────────────────

if (START) await startStack();

await group("api", async () => {
	const g = "api";
	const anon = new ApiUser("anonymous@example.com");

	const health = await anon.request("GET", "/");
	check(g, "GET / answers 200 JSON", health.status === 200 && health.json.success === true, API);

	const config = await anon.request("GET", "/config");
	const configKeys = Object.keys((config.json.config as Record<string, unknown>) ?? {});
	check(
		g,
		"/config exposes only feature flags (no secrets)",
		config.status === 200 && configKeys.every((k) => /^enable|abacatepayPixTestMode$/i.test(k)),
		configKeys.join(", "),
	);

	for (const path of ["/transactions", "/transactions/statistics", "/users/me", "/payments/status"]) {
		const res = await anon.request("GET", path);
		check(g, `unauthenticated GET ${path} → 401`, res.status === 401, `got ${res.status}`);
	}
	const tampered = new ApiUser("x@example.com");
	tampered.cookie = "better-auth.session_token=forged.token";
	check(g, "forged session cookie is rejected", (await tampered.request("GET", "/users/me")).status === 401);

	// Sign-up / sign-in
	const alice = new ApiUser(`qa-alice-${RUN_ID}@example.com`);
	const bob = new ApiUser(`qa-bob-${RUN_ID}@example.com`);
	check(g, "sign-up with a strong password", (await alice.signUp("Alice QA")) === 200 && Boolean(alice.cookie));
	check(g, "second user sign-up", (await bob.signUp("Bob QA")) === 200 && Boolean(bob.cookie));
	const weak = new ApiUser(`qa-weak-${RUN_ID}@example.com`, "123");
	check(g, "sign-up rejects a weak password", (await weak.signUp()) >= 400);
	check(g, "sign-up rejects a duplicate e-mail", (await new ApiUser(alice.email).signUp()) >= 400);
	const xssName = new ApiUser(`qa-xss-${RUN_ID}@example.com`);
	await xssName.signUp('<script>alert("name")</script>');
	const xssProfile = await xssName.request("GET", "/users/me");
	check(
		g,
		"HTML in the user name comes back as inert JSON data",
		(xssProfile.headers.get("content-type") ?? "").includes("application/json"),
	);

	const wrong = new ApiUser(ADMIN.email, "wrong-password");
	check(g, "sign-in with a wrong password → 401", (await wrong.signIn()) === 401);
	for (const email of [`${ADMIN.email}' OR '1'='1`, `${ADMIN.email}'--`, `" OR ""="`]) {
		const res = await new ApiUser(email, "x").signIn();
		check(g, `SQL injection in the login e-mail is refused (${email})`, res >= 400 && res < 500, `got ${res}`);
	}
	const operatorLogin = await anon.request("POST", "/auth/sign-in/email", {
		email: { $ne: null },
		password: { $ne: null },
	});
	check(g, "operator-object login payload is refused", operatorLogin.status >= 400 && operatorLogin.status < 500);

	// CRUD
	const created = await alice.request("POST", "/transactions", newTx(`QA mercado ${RUN_ID}`, 4990));
	const tx = created.json.transaction as Tx | undefined;
	check(g, "create transaction → 201", created.status === 201 && Boolean(tx?.id), `got ${created.status}`);
	const txId = tx?.id ?? "00000000-0000-4000-8000-000000000000";
	check(g, "read own transaction", (await alice.request("GET", `/transactions/${txId}`)).status === 200);
	const list = await alice.request("GET", "/transactions?perPage=50");
	check(
		g,
		"list contains the new transaction",
		((list.json.transactions as Tx[]) ?? []).some((t) => t.id === txId),
	);
	const updated = await alice.request("PUT", `/transactions/${txId}`, { amount: 9999 });
	check(
		g,
		"update transaction amount",
		updated.status === 200 && (updated.json.transaction as Tx | undefined)?.amount === 9999,
	);
	check(g, "statistics endpoint", (await alice.request("GET", "/transactions/statistics")).status === 200);

	// Validation / malformed input
	const invalidBodies: [string, unknown][] = [
		["negative amount", newTx("x", -100)],
		["fractional cents", newTx("x", 10.5)],
		["string amount", { ...newTx("x"), amount: "100" }],
		["amount above the maximum", newTx("x", 100_000_000_001)],
		["empty description", newTx("   ")],
		["281-char description", newTx("a".repeat(281))],
		["unknown category", { ...newTx("x"), category: "hacking" }],
		["unknown type", { ...newTx("x"), type: "refund" }],
		["non-ISO date", { ...newTx("x"), date: "yesterday" }],
		["1 MB description", newTx("a".repeat(1_000_000))],
	];
	for (const [label, body] of invalidBodies) {
		const res = await alice.request("POST", "/transactions", body);
		check(g, `rejects ${label} (4xx, not 5xx)`, res.status >= 400 && res.status < 500, `got ${res.status}`);
	}
	const malformed = await alice.request("POST", "/transactions", "{not json", { "content-type": "application/json" });
	check(g, "malformed JSON → 400", malformed.status === 400, `got ${malformed.status}`);
	check(g, "non-UUID id → 4xx", (await alice.request("GET", "/transactions/1%20OR%201=1")).status < 500);

	// SQL injection through query strings
	for (const payload of [
		"' OR 1=1 --",
		"%' UNION SELECT email, password FROM user --",
		'"; DROP TABLE "transaction"; --',
		"') OR ('a'='a",
	]) {
		const res = await alice.request("GET", `/transactions?search=${encodeURIComponent(payload)}`);
		check(
			g,
			`SQL injection in ?search is inert (${payload.slice(0, 24)})`,
			(res.status === 200 && res.json.total === 0) || (res.status >= 400 && res.status < 500),
			`status ${res.status}, total ${String(res.json.total)}`,
		);
	}
	const percent = await alice.request("GET", `/transactions?search=${encodeURIComponent("50% off")}`);
	check(g, "search text containing % is accepted", percent.status === 200, `got ${percent.status}`);
	const sqliCategory = await alice.request("GET", `/transactions?category=${encodeURIComponent("food' OR '1'='1")}`);
	check(g, "SQL injection in ?category → 4xx", sqliCategory.status >= 400 && sqliCategory.status < 500);
	check(
		g,
		"transaction table survived the injection attempts",
		(await alice.request("GET", "/transactions")).status === 200,
	);

	// Stored XSS payload travels as data, never as HTML
	const xssPayload = `<img src=x onerror=alert(1)> QA-XSS-${RUN_ID}`;
	const xssTx = await alice.request("POST", "/transactions", newTx(xssPayload));
	check(
		g,
		"XSS payload is stored and served as JSON, not HTML",
		xssTx.status === 201 && (xssTx.headers.get("content-type") ?? "").includes("application/json"),
	);

	// IDOR: Bob must never reach Alice's data
	check(
		g,
		"IDOR: other user cannot read a transaction",
		(await bob.request("GET", `/transactions/${txId}`)).status === 404,
	);
	check(
		g,
		"IDOR: other user cannot update a transaction",
		(await bob.request("PUT", `/transactions/${txId}`, { amount: 1 })).status === 404,
	);
	check(
		g,
		"IDOR: other user cannot delete a transaction",
		(await bob.request("DELETE", `/transactions/${txId}`)).status === 404,
	);
	const bobList = await bob.request("GET", "/transactions?perPage=100");
	check(g, "IDOR: other user's list stays empty", ((bobList.json.transactions as Tx[]) ?? []).length === 0);
	const smuggled = await bob.request("POST", "/transactions", { ...newTx(`QA smuggle ${RUN_ID}`), userId: alice.id });
	const aliceSees = await alice.request("GET", `/transactions?search=${encodeURIComponent(`QA smuggle ${RUN_ID}`)}`);
	check(
		g,
		"mass assignment: userId in the body cannot write into another account",
		smuggled.status === 201 && aliceSees.json.total === 0,
	);

	// Mass assignment on the profile
	const before = (await alice.request("GET", "/users/me")).json.user as Record<string, unknown> | undefined;
	await alice.request("PUT", "/users/me", {
		name: "Alice Renamed",
		email: "hijack@example.com",
		plan: "pro",
		role: "admin",
		emailVerified: true,
	});
	const after = (await alice.request("GET", "/users/me")).json.user as Record<string, unknown> | undefined;
	check(g, "profile update changes the name", after?.name === "Alice Renamed");
	check(
		g,
		"mass assignment: e-mail/plan/role in the profile body are ignored",
		after?.email === before?.email && JSON.stringify(after?.plan) === JSON.stringify(before?.plan),
		`plan ${JSON.stringify(after?.plan)}`,
	);

	// Free plan limit (business rule enforced server-side)
	let limitStatus = 0;
	for (let i = 0; i < 12 && limitStatus !== 403; i++) {
		limitStatus = (await alice.request("POST", "/transactions", newTx(`QA limite ${i}`))).status;
	}
	check(g, "free plan limit is enforced by the API (403)", limitStatus === 403, `last status ${limitStatus}`);

	// Delete
	check(g, "delete own transaction", (await alice.request("DELETE", `/transactions/${txId}`)).status === 200);
	check(g, "deleted transaction → 404", (await alice.request("GET", `/transactions/${txId}`)).status === 404);

	// API keys (x-api-key)
	const keyRes = await alice.request("POST", "/auth/api-key/create", { name: "qa" });
	const apiKey = String(keyRes.json.key ?? "");
	check(g, "create an API key", keyRes.status === 200 && apiKey.length > 10, `got ${keyRes.status}`);
	const byKey = await anon.request("GET", "/transactions", undefined, { "x-api-key": apiKey });
	check(g, "x-api-key authenticates /transactions", byKey.status === 200);
	const badKey = await anon.request("GET", "/transactions", undefined, { "x-api-key": "not-a-real-key" });
	check(g, "invalid x-api-key is rejected", badKey.status === 401 || badKey.status === 403, `got ${badKey.status}`);

	// Secrets-protected endpoints
	for (const path of ["/cron/check-expired-plans", "/cron/delete-pending-accounts"]) {
		check(g, `${path} without the secret → 401`, (await anon.request("GET", path)).status === 401);
		const forged = await anon.request("GET", path, undefined, { authorization: "Bearer guessed" });
		check(g, `${path} with a wrong bearer → 401`, forged.status === 401);
	}
	const webhook = await anon.request("POST", "/webhook/abacatepay?webhookSecret=guessed", { event: "billing.paid" });
	check(g, "payment webhook with a wrong secret is refused", webhook.status >= 400 && webhook.status < 500);

	// CORS
	const evil = await fetch(`${API}/transactions`, {
		method: "OPTIONS",
		headers: { origin: "https://evil.example", "access-control-request-method": "GET" },
	});
	const evilOrigin = evil.headers.get("access-control-allow-origin");
	check(g, "CORS does not allow a foreign origin", evilOrigin !== "https://evil.example" && evilOrigin !== "*");
	const good = await fetch(`${API}/transactions`, {
		method: "OPTIONS",
		headers: { origin: WEB, "access-control-request-method": "GET" },
	});
	check(g, "CORS allows the web origin", good.headers.get("access-control-allow-origin") === WEB);

	// Error hygiene
	const missing = await anon.request("GET", "/does-not-exist");
	check(
		g,
		"unknown route → 404 JSON without a stack trace",
		missing.status === 404 && !/at .+\.ts:\d+/.test(missing.text),
	);
	check(g, "path traversal attempt → 404", (await anon.request("GET", "/..%2f..%2fetc%2fpasswd")).status === 404);
	check(g, "no X-Powered-By banner", !health.headers.has("x-powered-by"));

	// Session end + account deletion
	const signOut = await bob.request("POST", "/auth/sign-out", {});
	check(g, "sign-out", signOut.status === 200);
	check(g, "session is dead after sign-out", (await bob.request("GET", "/users/me")).status === 401);
	await bob.signIn();
	const deletion = await bob.request("DELETE", "/users/me");
	check(g, "account deletion request", deletion.status === 200 && Boolean(deletion.json.deletionRequestedAt));

	check(g, "no 5xx response during the whole API run", serverErrors.length === 0, serverErrors.join("; "));
});

// ── web (browser) ────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
	"/",
	"/entrar",
	"/criar-conta",
	"/esqueci-senha",
	"/contato",
	"/termos-de-uso",
	"/politica-de-privacidade",
	"/api",
];
const PROTECTED_ROUTES = ["/dashboard", "/minha-conta", "/checkout"];
// Never clicked by the crawler: they leave the app, end the session or
// destroy data (covered by explicit flows instead).
const RISKY_CONTROL = /sair|excluir|apagar|deletar|google|telegram|github|logout/i;

function trackErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	return errors;
}

async function shot(page: Page, name: string): Promise<void> {
	if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }).catch(() => undefined);
}

// Locator.isVisible() answers immediately; this waits like a person would.
function appears(locator: Locator, state: "visible" | "detached" = "visible", timeout = 10_000): Promise<boolean> {
	return locator
		.waitFor({ state, timeout })
		.then(() => true)
		.catch(() => false);
}

async function webLogIn(page: Page, base: string, email: string, password: string): Promise<void> {
	await page.goto(`${base}/entrar`);
	await page.waitForLoadState("networkidle");
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function crawlControls(page: Page, url: string, errors: string[]): Promise<number> {
	await page.goto(url);
	await page.waitForLoadState("networkidle");
	const selector = "button:visible, a[href^='/']:visible, [role=tab]:visible";
	const total = Math.min(await page.locator(selector).count(), 30);
	let clicked = 0;
	for (let i = 0; i < total; i++) {
		if (page.url() !== url) {
			await page.goto(url);
			await page.waitForLoadState("networkidle");
		}
		const control = page.locator(selector).nth(i);
		const label = ((await control.textContent().catch(() => "")) ?? "").trim();
		const aria = (await control.getAttribute("aria-label").catch(() => "")) ?? "";
		if (RISKY_CONTROL.test(`${label} ${aria}`)) continue;
		await control.click({ timeout: 3000 }).catch(() => undefined);
		await page.waitForTimeout(300);
		await page.keyboard.press("Escape").catch(() => undefined);
		clicked++;
	}
	return errors.length === 0 ? clicked : -clicked;
}

let browser: Browser | undefined;

await group("web", async () => {
	const g = "web";
	browser = await chromium.launch({ headless: HEADLESS });

	// Every public page renders, has a title and no image without alt text
	const context = await browser.newContext();
	const page = await context.newPage();
	const errors = trackErrors(page);
	for (const route of PUBLIC_ROUTES) {
		errors.length = 0;
		const response = await page.goto(`${WEB}${route}`);
		await page.waitForLoadState("networkidle");
		check(
			g,
			`${route} renders (HTTP ${response?.status()})`,
			(response?.status() ?? 500) < 400 && errors.length === 0,
			errors.join("; "),
		);
		check(g, `${route} has a <title>`, (await page.title()).trim().length > 0);
		const missingAlt = await page.locator("img:not([alt])").count();
		check(g, `${route} images have alt text`, missingAlt === 0, `${missingAlt} without alt`);
		await shot(page, `web${route === "/" ? "_home" : route.replaceAll("/", "_")}`);
	}
	const notFound = await page.goto(`${WEB}/pagina-que-nao-existe-${RUN_ID}`);
	check(
		g,
		"unknown page shows the not-found screen",
		(notFound?.status() ?? 0) === 404 || (await page.getByText(/não encontrad/i).count()) > 0,
	);

	for (const route of PROTECTED_ROUTES) {
		await page.goto(`${WEB}${route}`);
		await page.waitForLoadState("networkidle");
		check(
			g,
			`${route} redirects anonymous visitors to /entrar`,
			new URL(page.url()).pathname === "/entrar",
			page.url(),
		);
	}

	// Click every safe control on every public page
	for (const route of PUBLIC_ROUTES) {
		errors.length = 0;
		const clicked = await crawlControls(page, `${WEB}${route}`, errors);
		check(
			g,
			`clicked ${Math.abs(clicked)} controls on ${route} without a crash`,
			clicked >= 0,
			errors.join("; ").slice(0, 300),
		);
	}

	// Reflected XSS through query strings
	await page.goto(
		`${WEB}/entrar?redirect=${encodeURIComponent("javascript:alert(1)")}&q=<script>window.__qaXss=1</script>`,
	);
	await page.waitForLoadState("networkidle");
	check(g, "reflected XSS in the query string does not execute", !(await page.evaluate(() => "__qaXss" in window)));

	// Sign-up → dashboard → CRUD with an XSS payload → account → logout
	const user = await browser.newContext();
	const app = await user.newPage();
	const appErrors = trackErrors(app);
	const email = `qa-web-${RUN_ID}@example.com`;
	await app.goto(`${WEB}/criar-conta`);
	await app.waitForLoadState("networkidle");
	await app.getByLabel("Nome").fill("Web QA");
	await app.getByLabel("E-mail").fill(email);
	await app.getByLabel("Senha", { exact: true }).fill(STRONG_PASSWORD);
	await app.getByRole("button", { name: "Criar conta", exact: true }).click();
	await app.waitForURL(/\/dashboard/, { timeout: 15_000 }).catch(() => undefined);
	check(g, "sign-up lands on the dashboard", app.url().includes("/dashboard"), app.url());
	await shot(app, "web_dashboard_new_user");

	const payload = `<img src=x onerror="window.__qaXss=1"> QA web ${RUN_ID}`;
	await app.getByRole("button", { name: "Adicionar Despesa" }).click();
	await app.getByLabel("Descrição").fill(payload);
	await app.getByLabel("Valor").fill("12.34");
	await app.getByRole("button", { name: "Criar transação" }).click();
	await app.getByLabel("Buscar por nome").fill(`QA web ${RUN_ID}`);
	const row = app.getByRole("row", { name: new RegExp(`QA WEB ${RUN_ID}`, "i") });
	const rowVisible = await appears(row.first());
	check(g, "create a transaction through the UI", rowVisible);
	check(
		g,
		"stored XSS in the description renders as text",
		!(await app.evaluate(() => "__qaXss" in window)) && (await app.locator("tbody img[src=x]").count()) === 0,
	);
	await shot(app, "web_transaction_created");

	if (rowVisible) {
		await row.getByRole("button", { name: "Editar" }).click();
		await app.getByLabel("Valor").fill("56.78");
		await app.getByRole("button", { name: "Salvar alterações" }).click();
		check(g, "edit the transaction through the UI", await appears(row.getByText("R$ 56,78")));
		await row.getByRole("button", { name: "Excluir" }).click();
		await app.getByRole("button", { name: "Confirmar exclusão" }).click();
		check(g, "delete the transaction through the UI", await appears(row.first(), "detached"));
	}

	for (const [name, file] of [
		["Exportar .xlsx", "transacoes.xlsx"],
		["Exportar .csv", "transacoes.csv"],
	] as const) {
		const button = app.getByRole("button", { name });
		if (!(await button.isEnabled().catch(() => false))) continue;
		const download = app.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
		await button.click();
		check(g, `${name} downloads ${file}`, (await download)?.suggestedFilename() === file);
	}

	for (const route of ["/dashboard", "/minha-conta", "/api", "/checkout"]) {
		appErrors.length = 0;
		const clicked = await crawlControls(app, `${WEB}${route}`, appErrors);
		check(
			g,
			`logged in: clicked ${Math.abs(clicked)} controls on ${route} without a crash`,
			clicked >= 0,
			appErrors.join("; ").slice(0, 300),
		);
	}
	await app.goto(`${WEB}/minha-conta`);
	await app.waitForLoadState("networkidle");
	check(g, "account page shows the free plan", await appears(app.getByText("Gratuito").first()));
	await shot(app, "web_account");

	await app.goto(`${WEB}/dashboard`);
	await app.waitForLoadState("networkidle");
	await app
		.getByRole("button", { name: /menu|conta|web qa/i })
		.first()
		.click()
		.catch(() => undefined);
	await app
		.getByText("Sair", { exact: true })
		.click({ timeout: 5000 })
		.catch(() => undefined);
	await app.waitForTimeout(1500);
	await app.goto(`${WEB}/dashboard`);
	await app.waitForLoadState("networkidle");
	check(
		g,
		"logout ends the session (dashboard redirects to /entrar)",
		new URL(app.url()).pathname === "/entrar",
		app.url(),
	);

	// Wrong password + open redirect after login
	const guest = await (await browser.newContext()).newPage();
	await webLogIn(guest, WEB, ADMIN.email, "wrong-password");
	await guest.waitForTimeout(1500);
	check(g, "wrong password keeps the user on /entrar", new URL(guest.url()).pathname === "/entrar");
	await guest.goto(`${WEB}/entrar?redirect=${encodeURIComponent("https://evil.example")}`);
	await webLogIn(guest, WEB, ADMIN.email, ADMIN.password);
	await guest.waitForTimeout(3000);
	check(
		g,
		"login never redirects to a foreign origin",
		new URL(guest.url()).origin === new URL(WEB).origin,
		guest.url(),
	);
	await shot(guest, "web_admin_dashboard");
	await browser.close();
});

// ── desktop (Electron) ───────────────────────────────────────────────────────

await group("desktop", async () => {
	const g = "desktop";
	const build = Bun.spawnSync(["bun", "run", "build"], { cwd: join(ROOT, "desktop-electronjs") });
	if (
		!check(
			g,
			"desktop main process builds",
			build.exitCode === 0,
			build.exitCode ? build.stderr.toString().slice(-300) : "",
		)
	)
		return;
	const executablePath = (await import("electron")).default as unknown as string;
	const launch = (url: string) =>
		_electron.launch({ executablePath, args: [join(ROOT, "desktop-electronjs"), "--url", url], cwd: ROOT });

	const electronApp = await launch(WEB);
	const appWindow = await electronApp.firstWindow();
	await appWindow.waitForLoadState("domcontentloaded");
	check(g, "window opens the web app", appWindow.url().startsWith(WEB), appWindow.url());
	check(
		g,
		"renderer has no Node.js (require/process)",
		await appWindow.evaluate(
			() =>
				typeof (globalThis as { require?: unknown }).require === "undefined" &&
				typeof (globalThis as { process?: unknown }).process === "undefined",
		),
	);

	await webLogIn(appWindow, WEB, ADMIN.email, ADMIN.password);
	await appWindow.waitForURL(/\/dashboard/, { timeout: 15_000 }).catch(() => undefined);
	check(
		g,
		"login inside the desktop app reaches the dashboard",
		appWindow.url().includes("/dashboard"),
		appWindow.url(),
	);
	if (SHOTS) await appWindow.screenshot({ path: join(SHOTS, "desktop_dashboard.png") });

	await appWindow.evaluate(() => window.open("http://example.invalid/popup"));
	await appWindow.waitForTimeout(500);
	check(g, "window.open never spawns a second window", electronApp.windows().length === 1);
	await appWindow.evaluate(() => {
		window.location.href = "http://example.invalid/phish";
	});
	await appWindow.waitForTimeout(1000);
	check(g, "navigation to a foreign origin is blocked", appWindow.url().startsWith(WEB), appWindow.url());
	const permission = await appWindow.evaluate(() => Notification.requestPermission());
	check(g, "notification permission is denied", permission === "denied", permission);
	await electronApp.close();

	const offlineApp = await launch("http://localhost:9");
	const offlineWindow = await offlineApp.firstWindow();
	const offline = await offlineWindow
		.getByText("Sem conexão com o servidor")
		.waitFor({ timeout: 15_000 })
		.then(() => true)
		.catch(() => false);
	check(g, "unreachable server shows the offline screen", offline);
	if (SHOTS) await offlineWindow.screenshot({ path: join(SHOTS, "desktop_offline.png") });
	await offlineApp.close();
});

// ── bot (Telegram, in-process with a fake Telegram API) ──────────────────────

function readEnvFile(path: string): Record<string, string> {
	return Object.fromEntries(
		readFileSync(path, "utf8")
			.split(/\r?\n/)
			.filter((line) => /^[A-Z0-9_]+=/.test(line))
			.map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).replace(/^"|"$/g, "")]),
	);
}

await group("bot", async () => {
	const g = "bot";
	const dbPath = join(ROOT, "backend", "e2e.db");
	if (!existsSync(dbPath)) {
		skip(g, "backend/e2e.db missing — run with --start (or `bun run --cwd backend test:e2e:setup`)");
		return;
	}
	// Both env schemas are parsed at import time, so set them before importing.
	Object.assign(
		process.env,
		readEnvFile(join(ROOT, "bot", ".env.test")),
		// Last so its secrets win: the seeded e2e.db is encrypted with them.
		readEnvFile(join(ROOT, "backend", ".env.e2e")),
		{
			DATABASE_PROVIDER: "sqlite",
			DATABASE_URL: `file:${dbPath.replaceAll("\\", "/")}`,
			TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS: "false",
		},
	);
	const { createBot } = await import("../bot/src/bot");
	const bot = createBot();
	const chat = { id: 900_000_000 + Math.floor(Math.random() * 99_999), type: "private" as const, first_name: "QA" };
	const from = { id: chat.id, is_bot: false, first_name: "QA" };
	bot.botInfo = {
		id: 1,
		is_bot: true,
		first_name: "QA Bot",
		username: "qa_bot",
		can_join_groups: false,
		can_read_all_group_messages: false,
		supports_inline_queries: false,
		can_connect_to_business: false,
		has_main_web_app: false,
	} as typeof bot.botInfo;

	const sent: string[] = [];
	let messageId = 1;
	// A fake Telegram Bot API at the HTTP layer: API transformers would not
	// work, @grammyjs/conversations rebuilds `ctx.api` without them.
	const fakeTelegram = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const method = String(input).split("/").pop() ?? "";
		let body: { text?: string; caption?: string } = {};
		if (typeof init?.body === "string") body = JSON.parse(init.body) as typeof body;
		if (body.text || body.caption) sent.push(String(body.text ?? body.caption));
		if (method === "sendDocument") sent.push("[document]");
		const result = /^(send|edit)/.test(method)
			? { message_id: messageId++, date: Math.floor(Date.now() / 1000), chat, text: body.text ?? "" }
			: true;
		return Response.json({ ok: true, result });
	};
	// `clientConfig` is what handleUpdate() builds each ctx.api from.
	(bot as unknown as { clientConfig: { fetch: typeof fetch } }).clientConfig = {
		fetch: fakeTelegram as typeof fetch,
	};

	let updateId = 1;
	const say = async (text: string): Promise<string> => {
		const start = sent.length;
		const entities = text.startsWith("/")
			? [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0]?.length ?? 0 }]
			: undefined;
		await bot.handleUpdate({
			update_id: updateId++,
			message: { message_id: messageId++, date: Math.floor(Date.now() / 1000), chat, from, text, entities },
		});
		return sent.slice(start).join("\n");
	};
	const tap = async (data: string): Promise<string> => {
		const start = sent.length;
		await bot.handleUpdate({
			update_id: updateId++,
			callback_query: {
				id: String(updateId),
				from,
				chat_instance: "qa",
				data,
				message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat, text: "menu" },
			},
		});
		return sent.slice(start).join("\n");
	};
	const noCrash = (reply: string): boolean => reply.length > 0 && !/erro inesperado/i.test(reply);

	let reply = await say("/start");
	check(
		g,
		"/start on an unlinked chat shows the access menu",
		/escolha como você quer acessar/i.test(reply),
		reply.slice(0, 80),
	);
	reply = await tap("authmenu:login");
	check(g, "login option asks for the e-mail", /e-mail/i.test(reply));
	reply = await say(ADMIN.email);
	check(g, "e-mail step asks for the password", /senha/i.test(reply));
	reply = await say("wrong-password");
	check(g, "wrong password is refused", /incorret|inválid/i.test(reply), reply.slice(0, 80));
	await tap("authmenu:login");
	await say(ADMIN.email);
	reply = await say(ADMIN.password);
	check(g, "correct credentials link the chat", /conta vinculada/i.test(reply), reply.slice(0, 80));

	for (const action of ["summary", "transactions", "categories", "help"]) {
		reply = await tap(`menu:${action}`);
		check(g, `menu:${action} answers without an error`, noCrash(reply), reply.slice(0, 80));
		await say("/cancelar");
	}
	await tap("menu:transactions");
	reply = await say("/cancelar");
	check(g, "/cancelar leaves a running conversation", !/número/i.test(reply) && noCrash(reply), reply.slice(0, 80));

	await tap("menu:search");
	await tap("filter:name");
	reply = await say('\' OR 1=1; DROP TABLE "transaction"; --');
	check(g, "SQL injection in the search text is inert", noCrash(reply), reply.slice(0, 80));
	await say("/cancelar");

	await tap("menu:expense");
	reply = await say("abc");
	check(g, "invalid amount is rejected with guidance", /inválido/i.test(reply));
	await say("12.34");
	await tap("cat:food");
	reply = await say(`<b>QA bot ${RUN_ID}</b> *markdown* _test_`);
	check(g, "description with HTML/Markdown reaches the confirmation", noCrash(reply));
	reply = await tap("confirm:yes");
	check(g, "expense is saved", noCrash(reply), reply.slice(0, 80));

	reply = await tap("menu:report");
	check(g, "report menu opens", noCrash(reply));
	reply = await tap("report:7");
	check(g, "7-day report is generated", noCrash(reply), reply.slice(0, 80));

	reply = await say("mensagem aleatória que o bot não conhece");
	check(g, "unknown text falls back to the menu", /não entendi/i.test(reply));
	reply = await tap("menu:switch-account");
	check(g, "switch-account asks for confirmation", /tem certeza/i.test(reply));
	reply = await tap("logout:confirm");
	check(g, "logout unlinks the chat", /desconectada/i.test(reply));
});

// ── android (native app in the emulator via Expo Go) ─────────────────────────

interface UiNode {
	text: string;
	id: string;
	desc: string;
	x: number;
	y: number;
}

function androidSdk(): string | undefined {
	const candidates = [
		process.env.ANDROID_HOME,
		process.env.ANDROID_SDK_ROOT,
		process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Android", "Sdk"),
		join(homedir(), "Library", "Android", "sdk"),
		join(homedir(), "Android", "Sdk"),
	];
	return candidates.find((dir): dir is string => Boolean(dir) && existsSync(join(dir as string, "platform-tools")));
}

const exe = (name: string): string => (process.platform === "win32" ? `${name}.exe` : name);

class Android {
	constructor(
		readonly adb: string,
		readonly serial: string,
	) {}

	run(...command: string[]): string {
		return Bun.spawnSync([this.adb, "-s", this.serial, ...command]).stdout.toString();
	}

	nodes(): UiNode[] {
		for (let attempt = 0; attempt < 3; attempt++) {
			const xml = this.run("exec-out", "uiautomator", "dump", "/dev/tty");
			const nodes = [...xml.matchAll(/<node [^>]*>/g)].map(([tag]) => {
				const attr = (name: string): string =>
					(tag.match(new RegExp(` ${name}="([^"]*)"`))?.[1] ?? "")
						.replaceAll("&lt;", "<")
						.replaceAll("&gt;", ">")
						.replaceAll("&quot;", '"')
						.replaceAll("&#39;", "'")
						.replaceAll("&amp;", "&");
				const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = (attr("bounds").match(/\d+/g) ?? []).map(Number);
				return {
					text: attr("text"),
					id: attr("resource-id"),
					desc: attr("content-desc"),
					x: (x1 + x2) >> 1,
					y: (y1 + y2) >> 1,
				};
			});
			if (nodes.length) return nodes;
		}
		return [];
	}

	find(match: string | RegExp): UiNode | undefined {
		const hit = (value: string): boolean => (typeof match === "string" ? value === match : match.test(value));
		const nodes = this.nodes();
		// testID, then accessibility label (buttons), then plain text: a
		// screen title "Entrar" must not win over the "Entrar" button.
		return nodes.find((n) => hit(n.id)) ?? nodes.find((n) => hit(n.desc)) ?? nodes.find((n) => hit(n.text));
	}

	async waitFor(match: string | RegExp, timeoutMs = 20_000): Promise<UiNode | undefined> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			const node = this.find(match);
			if (node) return node;
			await Bun.sleep(700);
		}
		return undefined;
	}

	/** Swipes up (like a thumb) until the element is on screen. */
	async scrollTo(match: string | RegExp): Promise<boolean> {
		// uiautomator also lists scroll content below the fold (under the tab
		// bar): only a node in the middle of the screen is safe to tap.
		const onScreen = (): boolean => {
			const node = this.find(match);
			return Boolean(node && node.y > 300 && node.y < 1900);
		};
		for (let swipe = 0; swipe < 8; swipe++) {
			if (onScreen()) return true;
			this.run("shell", "input", "swipe", "540", "1700", "540", "700", "300");
			await Bun.sleep(500);
		}
		return onScreen();
	}

	hideKeyboard(): void {
		if (this.run("shell", "dumpsys", "input_method").includes("mInputShown=true")) {
			this.run("shell", "input", "keyevent", "4");
		}
	}

	async tap(match: string | RegExp, timeoutMs = 20_000): Promise<boolean> {
		const node = await this.waitFor(match, timeoutMs);
		if (node) this.run("shell", "input", "tap", String(node.x), String(node.y));
		await Bun.sleep(600);
		return Boolean(node);
	}

	async fill(match: string, text: string): Promise<boolean> {
		if (!(await this.tap(match))) return false;
		this.run("shell", `input keyevent 123 ${"67 ".repeat(60)}`);
		// `input text` goes through the device shell: spaces become %s and
		// the whole value is single-quoted.
		this.run("shell", `input text '${text.replaceAll(" ", "%s").replaceAll("'", "'\\''")}'`);
		this.hideKeyboard();
		await Bun.sleep(400);
		return true;
	}

	async screenshot(name: string): Promise<void> {
		if (!SHOTS) return;
		const png = Bun.spawnSync([this.adb, "-s", this.serial, "exec-out", "screencap", "-p"]).stdout;
		await Bun.write(join(SHOTS, `${name}.png`), png);
	}
}

function javaHome(): string | undefined {
	return [
		process.env.JAVA_HOME,
		"C:/Program Files/Android/Android Studio/jbr",
		"/Applications/Android Studio.app/Contents/jbr/Contents/Home",
		"/opt/android-studio/jbr",
	].find((dir): dir is string => Boolean(dir) && existsSync(dir as string));
}

async function bootEmulator(sdk: string): Promise<Android | string> {
	const adb = join(sdk, "platform-tools", exe("adb"));
	const emulator = join(sdk, "emulator", exe("emulator"));
	let avds = Bun.spawnSync([emulator, "-list-avds"])
		.stdout.toString()
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	let avd = argValue("avd", avds.includes("agent-money-qa") ? "agent-money-qa" : (avds[0] ?? ""));
	if (!avd) {
		const images = join(sdk, "system-images");
		const image = existsSync(images)
			? readdirSync(images).flatMap((api) =>
					readdirSync(join(images, api)).flatMap((tag) =>
						readdirSync(join(images, api, tag)).map((abi) => `system-images;${api};${tag};${abi}`),
					),
				)[0]
			: undefined;
		const java = javaHome();
		if (!image || !java)
			return "no AVD, and no system image + Java to create one (install them from Android Studio)";
		const avdmanager = join(
			sdk,
			"cmdline-tools",
			"latest",
			"bin",
			process.platform === "win32" ? "avdmanager.bat" : "avdmanager",
		);
		Bun.spawnSync([avdmanager, "create", "avd", "-n", "agent-money-qa", "-k", image, "-d", "pixel_6"], {
			stdin: new TextEncoder().encode("no\n"),
			env: { ...process.env, JAVA_HOME: java },
		});
		avds = ["agent-money-qa"];
		avd = "agent-money-qa";
	}

	const findSerial = (): string | undefined =>
		Bun.spawnSync([adb, "devices"])
			.stdout.toString()
			.split(/\r?\n/)
			.map((line) => line.split("\t"))
			.filter(([serial, state]) => serial?.startsWith("emulator-") && state === "device")
			.map(([serial]) => serial as string)
			.find(
				(serial) =>
					Bun.spawnSync([adb, "-s", serial, "emu", "avd", "name"])
						.stdout.toString()
						.split(/\r?\n/)[0]
						?.trim() === avd,
			);

	let serial = findSerial();
	if (!serial) {
		console.log(`Booting emulator "${avd}"…`);
		Bun.spawn(
			[
				emulator,
				"-avd",
				avd,
				"-no-snapshot-save",
				"-no-boot-anim",
				"-no-audio",
				...(HEADLESS ? ["-no-window"] : []),
			],
			{
				stdout: "ignore",
				stderr: "ignore",
			},
		).unref();
		const deadline = Date.now() + 240_000;
		while (!serial && Date.now() < deadline) {
			await Bun.sleep(3000);
			serial = findSerial();
		}
		if (!serial) return `emulator "${avd}" did not come online`;
	}
	const device = new Android(adb, serial);
	const deadline = Date.now() + 240_000;
	while (device.run("shell", "getprop", "sys.boot_completed").trim() !== "1") {
		if (Date.now() > deadline) return `emulator "${avd}" did not finish booting`;
		await Bun.sleep(2000);
	}
	return device;
}

async function ensureExpoGo(device: Android): Promise<string | undefined> {
	if (device.run("shell", "pm", "list", "packages", "host.exp.exponent").includes("host.exp.exponent"))
		return undefined;
	const expoVersion = (
		JSON.parse(readFileSync(join(ROOT, "mobile", "package.json"), "utf8")) as { dependencies: { expo: string } }
	).dependencies.expo;
	const sdk = `${expoVersion.replace(/^[~^]/, "").split(".")[0]}.0.0`;
	const versions = (await (await fetch("https://api.expo.dev/v2/versions")).json()) as {
		data: { sdkVersions: Record<string, { androidClientUrl?: string }> };
	};
	const url = versions.data.sdkVersions[sdk]?.androidClientUrl;
	if (!url) return `no Expo Go build published for SDK ${sdk}`;
	const apk = join(homedir(), ".expo", `expo-go-${sdk}.apk`);
	if (!existsSync(apk)) await Bun.write(apk, await fetch(url));
	device.run("install", "-r", apk);
	return undefined;
}

await group("android", async () => {
	const g = "android";
	const sdk = androidSdk();
	if (!sdk) {
		skip(g, "no Android SDK found (ANDROID_HOME, or Android Studio's default location)");
		return;
	}
	const device = await bootEmulator(sdk);
	if (typeof device === "string") {
		skip(g, device);
		return;
	}
	const installError = await ensureExpoGo(device);
	if (installError) {
		skip(g, installError);
		return;
	}

	// 10.0.2.2 is the emulator's alias for this computer's localhost. --no-dev: a
	// production bundle, as users get it — and no LogBox toasts, which float
	// over the tab bar and are invisible to uiautomator.
	const apiPort = new URL(API).port || "80";
	spawn(["bunx", "expo", "start", "--port", "8091", "--clear", "--no-dev", "--minify"], "mobile", {
		CI: "1",
		// The bot group loads backend/.env.e2e (NODE_ENV=test) into this process.
		NODE_ENV: "development",
		EXPO_PUBLIC_API_URL: `http://10.0.2.2:${apiPort}`,
	});
	if (!check(g, "Metro bundler starts", await waitForUrl("http://localhost:8091/status", 120_000))) return;

	device.run("shell", "pm", "clear", "host.exp.exponent");
	device.run("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "exp://10.0.2.2:8091");

	// First run: Expo Go's dev-menu onboarding appears over the app.
	const deadline = Date.now() + 240_000;
	let ready = false;
	let reloads = 0;
	while (!ready && Date.now() < deadline) {
		const nodes = device.nodes();
		if (nodes.some((n) => n.id === "field-E-mail")) ready = true;
		// Expo Go gives up when the first (uncached) bundle is slow: reopen.
		else if (nodes.some((n) => n.text === "Something went wrong.") && reloads++ < 2)
			device.run("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "exp://10.0.2.2:8091");
		else if (nodes.some((n) => n.text === "Continue")) await device.tap("Continue", 1000);
		else if (nodes.some((n) => n.text === "Toggle performance monitor"))
			device.run("shell", "input", "keyevent", "4");
		else await Bun.sleep(2000);
	}
	if (!check(g, "app boots to the login screen", ready)) {
		await device.screenshot("android_boot_failed");
		return;
	}
	await device.screenshot("android_login");

	await device.fill("field-E-mail", ADMIN.email);
	await device.fill("field-Senha", "wrong-password");
	await device.tap(/^Entrar$/);
	check(g, "wrong password shows an inline error", Boolean(await device.waitFor(/incorret/i, 15_000)));

	await device.fill("field-Senha", ADMIN.password);
	await device.tap(/^Entrar$/);
	check(g, "login reaches the dashboard", Boolean(await device.waitFor(/Olá, Admin/, 20_000)));
	await device.screenshot("android_dashboard");

	for (const tab of ["nav-search", "nav-import", "nav-profile", "nav-home"]) {
		const opened = await device.tap(tab);
		await Bun.sleep(1500);
		check(g, `${tab} opens without a red screen`, opened && !device.find(/Render Error|Uncaught/));
		await device.screenshot(`android_${tab}`);
		// Stacked screens (import) hide the tab bar.
		if (!device.find("nav-home")) await device.tap("Navigate up", 3000);
	}

	const description = `QA android ${RUN_ID} <b>x</b>`;
	await device.tap("nav-new-transaction");
	check(g, "new transaction screen opens", Boolean(await device.waitFor("Nova transação")));
	await device.fill("field-Valor", "4321");
	await device.fill("field-Descrição", description);
	await device.tap("Compras");
	await device.tap(/^Adicionar$/);
	check(g, "transaction is created", Boolean(await device.waitFor(/Olá, Admin/, 15_000)));

	await device.tap("nav-search");
	await device.fill("search-input", `QA android ${RUN_ID}`);
	const found = await device.waitFor(description, 15_000);
	check(g, "search finds it, HTML shown as literal text", Boolean(found));
	await device.screenshot("android_search");

	if (found) {
		await device.tap(description);
		check(g, "edit screen opens", Boolean(await device.waitFor("Editar transação")));
		await device.fill("field-Valor", "9999");
		await device.tap("Salvar alterações");
		check(g, "edited amount is shown", Boolean(await device.waitFor(/R\$ 99,99/, 15_000)));
		await device.tap(description);
		await device.tap("Excluir transação");
		await device.tap(/^(EXCLUIR|Excluir)$/, 5000);
		await Bun.sleep(2000);
		check(g, "transaction is deleted after the native confirmation", !device.find(description));
	}

	await device.tap("nav-search");
	await device.fill("search-input", "' OR 1=1 --");
	await Bun.sleep(2000);
	check(
		g,
		"SQL injection in the search box is inert",
		Boolean(device.find("search-input")) && !device.find(/Render Error|Uncaught/),
	);

	await device.tap("nav-profile");
	check(g, "profile shows the account screen", Boolean(await device.waitFor("Minha Conta")));
	await device.scrollTo("Sair da conta");
	await device.tap("Sair da conta");
	await device.tap(/^(SAIR|Sair)$/, 5000);
	check(g, "logout returns to the login screen", Boolean(await device.waitFor("field-E-mail", 15_000)));
	await device.screenshot("android_logged_out");
});

// ── report ───────────────────────────────────────────────────────────────────

stopChildren();

const failed = results.filter((r) => r.status === "fail");
const passed = results.filter((r) => r.status === "pass");
console.log(
	`\n${passed.length}/${passed.length + failed.length} checks passed${failed.length ? `, ${failed.length} FAILED` : ""}`,
);
if (REPORT) {
	const groups = [...new Set(results.map((r) => r.group))];
	const mark = { pass: "[x]", fail: "[ ]", skip: "[-]" };
	writeFileSync(
		REPORT,
		[
			`# QA report — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
			"",
			`${passed.length}/${passed.length + failed.length} checks passed · API ${API} · web ${WEB}`,
			"",
			...groups.flatMap((name) => [
				`## ${name}`,
				"",
				...results
					.filter((r) => r.group === name)
					.map((r) => `- ${mark[r.status]} ${r.name}${r.info ? ` — ${r.info.replaceAll("\n", " ")}` : ""}`),
				"",
			]),
		].join("\n"),
	);
	console.log(`report: ${REPORT}`);
}
process.exit(failed.length ? 1 : 0);
