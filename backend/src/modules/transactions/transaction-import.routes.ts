import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import { importConfirmRequestSchema, importPreviewRequestSchema } from "./transaction-import.schema";
import { transactionImportService } from "./transaction-import.service";

export const transactionImportRoutes = new Elysia({ prefix: "/transactions/import" })
	.use(authPlugin)
	.guard({ auth: true })
	.post("/preview", ({ body }) => ({ success: true, ...transactionImportService.preview(body.csv) }), {
		body: importPreviewRequestSchema,
	})
	.post(
		"/confirm",
		async ({ user, body }) => ({
			success: true,
			...(await transactionImportService.confirm(user.id, body.transactions)),
		}),
		{ body: importConfirmRequestSchema },
	);
