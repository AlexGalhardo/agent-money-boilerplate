import { z } from "zod";

export const updateProfileSchema = z.object({
	name: z.string().trim().min(1).max(120).optional(),
	image: z.url().optional(),
	// String vazia desvincula o chat (ver userService.updateProfile) — o
	// bot precisa poder vincular um chat a uma conta diferente sem exigir
	// que o usuário edite o banco manualmente.
	telegramChatId: z
		.union([
			z
				.string()
				.trim()
				.regex(/^-?\d+$/, "Chat ID inválido"),
			z.literal(""),
		])
		.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
