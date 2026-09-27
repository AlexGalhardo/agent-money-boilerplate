import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import { importConfirmRequestSchema, importPreviewRequestSchema } from "./transaction-import.schema";
import { transactionImportService } from "./transaction-import.service";

export const transactionImportRoutes = new Elysia({ prefix: "/transactions/import", tags: ["Importação"] })
	.use(authPlugin)
	.guard({ auth: true })
	.post("/preview", ({ body }) => ({ success: true, ...transactionImportService.preview(body.csv) }), {
		body: importPreviewRequestSchema,
		detail: {
			summary: "Pré-visualizar extrato do Nubank",
			description:
				"Recebe o conteúdo do CSV do Nubank (até 5 MB) e devolve as linhas classificadas por categoria, sem gravar nada.",
		},
	})
	.post(
		"/confirm",
		async ({ user, body }) => ({
			success: true,
			...(await transactionImportService.confirm(user.id, body.transactions)),
		}),
		{
			body: importConfirmRequestSchema,
			detail: {
				summary: "Confirmar importação",
				description:
					"Grava as linhas (até 5000). Duplicatas (mesma descrição, valor e dia) são ignoradas; no plano gratuito só entra até o limite restante.",
			},
		},
	);
