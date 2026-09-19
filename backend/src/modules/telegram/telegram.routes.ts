import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import { completeTelegramLinkSchema } from "./telegram.schema";
import { ChatAlreadyLinkedError, completeLinkToken, InvalidLinkTokenError } from "./telegram.service";

export const telegramRoutes = new Elysia({ prefix: "/telegram" })
	.use(authPlugin)
	.guard({ auth: true })
	.post(
		"/link",
		async ({ user, body, status }) => {
			try {
				const { chatId } = await completeLinkToken(user.id, body.token);
				return { success: true, chatId };
			} catch (error) {
				if (error instanceof InvalidLinkTokenError) {
					return status(400, { success: false, message: error.message });
				}
				if (error instanceof ChatAlreadyLinkedError) {
					return status(409, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ body: completeTelegramLinkSchema },
	);
