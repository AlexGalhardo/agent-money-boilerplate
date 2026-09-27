// API route prefixes the frontend forwards as if they were its own (see
// frontend/server.ts in production and vite.config.ts's `server.proxy` in
// dev) — the only way the API-issued session cookie is visible both to the
// frontend's SSR (getServerSession) and to authenticated browser calls
// (authClient, Eden `api`), since frontend and API are different Railway
// domains. `/webhook` and `/cron` are left out on purpose: external services
// call them on the API directly, never the browser.
export const PROXIED_API_PATHS = ["/auth", "/users", "/transactions", "/payments", "/config", "/telegram", "/openapi"];
