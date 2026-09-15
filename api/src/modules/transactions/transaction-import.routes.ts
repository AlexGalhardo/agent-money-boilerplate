import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import { FreeLimitReachedError } from "../../lib/plan";
import { importConfirmRequestSchema, importPreviewRequestSchema } from "./transaction-import.schema";
import { ImportParseError, transactionImportService } from "./transaction-import.service";

export const transactionImportRoutes = new Elysia({ prefix: "/transactions/import" })
	.use(authPlugin)
	.guard({ auth: true })
	.post(
		"/preview",
		async ({ body, status }) => {
			try {
				const result = transactionImportService.preview(body.csv);
				return { success: true, ...result };
			} catch (error) {
				if (error instanceof ImportParseError) {
					return status(400, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ body: importPreviewRequestSchema },
	)
	.post(
		"/confirm",
		async ({ user, body, status }) => {
			try {
				const result = await transactionImportService.confirm(user.id, body.transactions);
				return { success: true, ...result };
			} catch (error) {
				if (error instanceof FreeLimitReachedError) {
					return status(403, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ body: importConfirmRequestSchema },
	);
