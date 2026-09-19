import { z } from "zod";

import { transaction } from "./transactions";

/**
 * Sync uses the WatermelonDB change-set shape so the mobile client can adopt
 * `synchronize()` with a thin adapter. Only `transactions` is synced today;
 * the envelope is keyed by table to allow more collections later without a
 * contract change.
 */
const collectionChanges = <T extends z.ZodTypeAny>(record: T) =>
	z.object({
		created: z.array(record),
		updated: z.array(record),
		deleted: z.array(z.string()),
	});

export const syncChanges = z.object({
	transactions: collectionChanges(transaction),
});
export type SyncChanges = z.infer<typeof syncChanges>;

export const pullQuery = z.object({
	/** Milliseconds since epoch of the client's last successful pull; 0 = full sync. */
	lastPulledAt: z.coerce.number().int().min(0).default(0),
});
export type PullQuery = z.infer<typeof pullQuery>;

export const pullResponse = z.object({
	changes: syncChanges,
	/** New high-water mark the client must send on its next pull. */
	timestamp: z.number().int().positive(),
});
export type PullResponse = z.infer<typeof pullResponse>;

/** Push carries only the fields the client can author (no server timestamps). */
const pushRecord = transaction.pick({
	id: true,
	type: true,
	amountCents: true,
	category: true,
	description: true,
	date: true,
});

export const pushRequest = z.object({
	lastPulledAt: z.number().int().min(0),
	changes: z.object({
		transactions: z.object({
			created: z.array(pushRecord),
			updated: z.array(pushRecord),
			deleted: z.array(z.string()),
		}),
	}),
});
export type PushRequest = z.infer<typeof pushRequest>;

export const pushResponse = z.object({
	/** Server timestamp after applying the push; client stores it as lastPulledAt. */
	timestamp: z.number().int().positive(),
	/** Ids the server rejected (e.g. stale update lost a conflict); client should re-pull. */
	rejected: z.array(z.string()).default([]),
});
export type PushResponse = z.infer<typeof pushResponse>;
