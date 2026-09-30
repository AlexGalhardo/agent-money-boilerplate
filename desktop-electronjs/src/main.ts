// Electron shell around the web dashboard. The window loads the frontend
// server, which proxies the API on its own origin (frontend/proxy-paths.ts),
// so login, the session cookie and every page behave exactly as in a
// browser — no API client or UI is duplicated here.
//   electron . [--url http://localhost:4001] [--smoke]
// URL precedence: --url, DESKTOP_APP_URL, then package.json "appUrl" (set at
// package time by the release workflow). --smoke: CI check, exits 0 once a
// page (the app or the offline screen) has rendered.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, session, shell } from "electron";

const SMOKE = process.argv.includes("--smoke");
const SMOKE_TIMEOUT_MS = 30_000;
const RETRY_SECONDS = 5;

function argValue(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const { appUrl } = JSON.parse(readFileSync(join(app.getAppPath(), "package.json"), "utf8")) as { appUrl: string };
const APP_URL = new URL(argValue("--url") ?? process.env.DESKTOP_APP_URL ?? appUrl);

function isAppUrl(url: string): boolean {
	return URL.canParse(url) && new URL(url).origin === APP_URL.origin;
}

// Anything outside the app (Google OAuth, Telegram, docs links) opens in the
// user's browser: the window never becomes a general-purpose browser.
function openExternally(url: string): void {
	if (url.startsWith("https://")) void shell.openExternal(url);
}

// A data: page needs no IPC: the meta refresh (and the link) navigate back to
// APP_URL, which the will-navigate guard allows.
function offlinePage(): string {
	const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="${RETRY_SECONDS};url=${APP_URL.href}"><title>Agent Money</title>
<style>body{margin:0;height:100vh;display:grid;place-items:center;background:#09090b;color:#fafafa;font:15px system-ui,sans-serif;text-align:center}a{color:#22c55e}</style>
</head><body><main><h1>Sem conexão com o servidor</h1><p>${APP_URL.origin} não respondeu.</p>
<p>Tentando de novo em ${RETRY_SECONDS} s… <a href="${APP_URL.href}">Tentar agora</a></p></main></body></html>`;
	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

let loadFailed = false;

function createWindow(): BrowserWindow {
	const win = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		backgroundColor: "#09090b",
		title: "Agent Money",
		icon: join(app.getAppPath(), "assets", "icon.png"),
		autoHideMenuBar: true,
		show: !SMOKE,
	});

	win.webContents.setWindowOpenHandler(({ url }) => {
		openExternally(url);
		return { action: "deny" };
	});
	const guard = (event: Electron.Event, url: string): void => {
		if (isAppUrl(url)) return;
		event.preventDefault();
		openExternally(url);
	};
	win.webContents.on("will-navigate", guard);
	win.webContents.on("will-redirect", guard);
	win.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
		// -3 (ERR_ABORTED) is a navigation superseded by another one, not an outage.
		if (!isMainFrame || code === -3) return;
		console.error(`load failed: ${code} ${description} (${url})`);
		loadFailed = true;
		void win.loadURL(offlinePage());
	});

	if (SMOKE) smoke(win);
	void win.loadURL(APP_URL.href);
	return win;
}

function smoke(win: BrowserWindow): void {
	const fail = (reason: string): void => {
		console.error(`smoke: FAIL (${reason})`);
		app.exit(1);
	};
	const timer = setTimeout(() => fail(`nothing rendered after ${SMOKE_TIMEOUT_MS} ms`), SMOKE_TIMEOUT_MS);
	win.webContents.on("render-process-gone", (_event, details) => fail(details.reason));
	win.webContents.on("did-finish-load", () => {
		const offline = win.webContents.getURL().startsWith("data:");
		// Chromium's own error page also "finishes loading": wait for ours.
		if (loadFailed && !offline) return;
		clearTimeout(timer);
		console.log(`smoke: ok (${offline ? "offline screen" : "app"} rendered, ${APP_URL.origin})`);
		app.exit(0);
	});
}

// A second instance would open a duplicate window on the same session: focus
// the running one instead.
if (!SMOKE && !app.requestSingleInstanceLock()) app.exit(0);

let mainWindow: BrowserWindow | null = null;

app.on("second-instance", () => {
	if (!mainWindow) return;
	if (mainWindow.isMinimized()) mainWindow.restore();
	mainWindow.focus();
});

app.whenReady().then(() => {
	// Deny camera, microphone, geolocation, notifications…; copying (API key,
	// PIX code) only needs clipboard writes.
	session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) =>
		callback(permission === "clipboard-sanitized-write"),
	);
	mainWindow = createWindow();
});

app.on("window-all-closed", () => app.quit());
