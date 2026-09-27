import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import { completeTelegramLinkSchema } from "./telegram.schema";
import { completeLinkToken, unlinkUser } from "./telegram.service";

export const telegramRoutes = new Elysia({ prefix: "/telegram" })
	.use(authPlugin)
	.guard({ auth: true })
	.post(
		"/link",
		async ({ user, body }) => {
			const { chatId } = await completeLinkToken(user.id, body.token);
			return { success: true, chatId };
		},
		{ body: completeTelegramLinkSchema },
	)
	.delete("/link", async ({ user }) => {
		await unlinkUser(user.id);
		return { success: true };
	});
