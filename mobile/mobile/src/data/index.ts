import { isRemote } from "@/config/env";
import type { Repos } from "./types";

/**
 * Single switch point for the data layer. Screens and hooks import `repos`;
 * they never know which backend is active.
 *
 * The adapter is loaded with `require` rather than a static import so the
 * inactive one is never *evaluated* — in `remote` mode (web / store builds) the
 * local adapter's `expo-sqlite` import is skipped entirely.
 */
export const repos: Repos = isRemote
	? (require("./remote") as typeof import("./remote")).remoteRepos
	: (require("./local") as typeof import("./local")).localRepos;

export type { AuthRepo, Repos, SubscriptionRepo, TransactionRepo } from "./types";
