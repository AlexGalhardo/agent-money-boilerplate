import { Elysia } from "elysia";
import { prisma } from "../../config/prisma";
import { authPlugin } from "../../lib/auth.plugin";
import { updateProfileSchema } from "./user.schema";
import { ActivePlanError, userService } from "./user.service";

export const userRoutes = new Elysia({ prefix: "/users" })
	.use(authPlugin)
	.guard({ auth: true })
	.get("/me", async ({ user }) => {
		// session.user só traz os campos nativos do better-auth — planStatus,
		// freeTransactionCount, telegramChatId etc. não são additionalFields
		// registrados nele, então buscamos a linha completa via Prisma.
		const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		return { success: true, user: fullUser };
	})
	.put(
		"/me",
		async ({ user, body }) => {
			const updated = await userService.updateProfile(user.id, body);
			return { success: true, user: updated };
		},
		{ body: updateProfileSchema },
	)
	.delete("/me", async ({ user, status }) => {
		try {
			const { deletionRequestedAt } = await userService.requestDeletion(user.id);
			return { success: true, deletionRequestedAt: deletionRequestedAt.toISOString() };
		} catch (error) {
			if (error instanceof ActivePlanError) {
				return status(409, { success: false, message: error.message });
			}
			throw error;
		}
	});
