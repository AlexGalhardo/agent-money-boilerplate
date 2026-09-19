import { z } from "zod";

/**
 * ISO-8601 date (YYYY-MM-DD). The mobile app stores transaction dates as plain
 * calendar dates without a time component, so the contract enforces that shape.
 */
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");

/** ISO-8601 timestamp with timezone, used for `created_at`/`updated_at`. */
export const isoTimestamp = z.string().datetime({ offset: true });

/** Monetary amounts travel as integer cents to avoid floating-point drift. */
export const amountCents = z
	.number()
	.int("Valor deve ser um inteiro em centavos")
	.min(1, "Valor mínimo é R$ 0,01")
	.max(99_999_999, "Valor máximo é R$ 999.999,99");

export const email = z.string().trim().toLowerCase().email("Informe um e-mail válido");

export const password = z
	.string()
	.min(6, "A senha deve ter ao menos 6 caracteres")
	.max(128, "A senha deve ter no máximo 128 caracteres");

export const displayName = z
	.string()
	.trim()
	.min(2, "O nome deve ter ao menos 2 caracteres")
	.max(40, "O nome deve ter no máximo 40 caracteres");

export const uuid = z.string().uuid();

export const paginationQuery = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Uniform error envelope returned by every backend route on failure. */
export const errorResponse = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		/** Field-level messages keyed by dotted path, when the failure is a validation error. */
		fields: z.record(z.string(), z.string()).optional(),
	}),
});
export type ErrorResponse = z.infer<typeof errorResponse>;

export function makePage<T extends z.ZodTypeAny>(item: T) {
	return z.object({
		items: z.array(item),
		total: z.number().int().min(0),
		page: z.number().int().min(1),
		pageCount: z.number().int().min(1),
		pageSize: z.number().int().min(1),
	});
}
