import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT);

console.log(`🦊 Agent Money Boilerplate API listening on http://${app.server?.hostname}:${app.server?.port}`);

// Kept here (not only in app.ts) because the frontend and mobile Eden clients
// import `App` from "backend/src/server".
export type { App } from "./app";
