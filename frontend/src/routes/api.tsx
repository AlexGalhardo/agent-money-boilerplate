import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ClipboardJS from "clipboard";
import { useEffect, useRef, useState } from "react";
import { PageLayout } from "../components/page-layout";
import { Toast, useToast } from "../components/toast";
import { authClient } from "../lib/auth-client";
import { requireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/api")({
	head: () => ({ meta: [{ title: "API — Money" }] }),
	beforeLoad: requireAuth,
	component: ApiPage,
});

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const ENDPOINTS = [
	{
		method: "GET",
		path: "/transactions",
		description: "Lista transações (paginado, com filtros).",
		query: "search?: string · category?: string · from?: string (ISO) · to?: string (ISO) · page?: number = 1 · perPage?: number = 20 (máx. 1000)",
		body: null,
		response: `{ success: true, transactions: TransactionDTO[], total: number, page: number, perPage: number }`,
	},
	{
		method: "GET",
		path: "/transactions/statistics",
		description: "Totais e percentuais por categoria, já separados por tipo (income/expense).",
		query: null,
		body: null,
		response: `{ success: true, stats: { category: string, type: "income" | "expense", total: number, percentage: number }[] }`,
	},
	{
		method: "GET",
		path: "/transactions/:id",
		description: "Busca uma transação específica.",
		query: null,
		body: null,
		response: `{ success: true, transaction: TransactionDTO } — 404 se não existir ou não for sua`,
	},
	{
		method: "POST",
		path: "/transactions",
		description: "Cria uma transação.",
		query: null,
		body: `{ description: string (1-280 chars), amount: number (inteiro, centavos, positivo), category: TransactionCategory, type: "income" | "expense", date?: string (ISO, opcional) }`,
		response: `201 { success: true, transaction: TransactionDTO } — 403 se o plano gratuito atingiu o limite de transações`,
	},
	{
		method: "PUT",
		path: "/transactions/:id",
		description: "Atualiza uma transação (todos os campos são opcionais — envie só o que quer mudar).",
		query: null,
		body: `Partial<{ description, amount, category, type, date }> (mesmos tipos do POST)`,
		response: `{ success: true, transaction: TransactionDTO } — 404 se não existir ou não for sua`,
	},
	{
		method: "DELETE",
		path: "/transactions/:id",
		description: "Remove uma transação.",
		query: null,
		body: null,
		response: `{ success: true, message: string } — 404 se não existir ou não for sua`,
	},
] as const;

const TRANSACTION_DTO_TYPE = `type TransactionDTO = {
	id: string;
	description: string;
	amount: number; // centavos
	category: string;
	type: "income" | "expense";
	date: string; // ISO 8601
	createdAt: string;
	updatedAt: string | null;
};`;

function buildFetchExample(method: string, path: string, hasBody: boolean): string {
	return `await fetch("${API_URL}${path}", {
	method: "${method}",
	headers: {
		"x-api-key": "SEU_TOKEN_AQUI",
		"Content-Type": "application/json",
	},${
		hasBody
			? `
	body: JSON.stringify({ description: "Supermercado", amount: 15000, category: "food", type: "expense" }),`
			: ""
	}
}).then((response) => response.json());`;
}

function buildCurlExample(method: string, path: string, hasBody: boolean): string {
	return `curl -X ${method} "${API_URL}${path}" \\
	-H "x-api-key: SEU_TOKEN_AQUI"${
		hasBody
			? ` \\
	-H "Content-Type: application/json" \\
	-d '{"description":"Supermercado","amount":15000,"category":"food","type":"expense"}'`
			: ""
	}`;
}

function ApiPage() {
	const queryClient = useQueryClient();
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const copyButtonsRef = useRef<HTMLDivElement>(null);
	const { message: toastMessage, showToast } = useToast();

	const keysQuery = useQuery({
		queryKey: ["api-keys"],
		queryFn: async () => {
			const { data, error } = await authClient.apiKey.list();
			if (error) throw error;
			return data.apiKeys;
		},
	});

	useEffect(() => {
		const clipboard = new ClipboardJS("[data-clipboard-target], [data-clipboard-text]", {
			container: copyButtonsRef.current ?? undefined,
		});
		clipboard.on("success", () => showToast("Copiado!"));
		return () => clipboard.destroy();
	}, [showToast]);

	async function handleCreateKey(): Promise<void> {
		setCreating(true);
		const { data, error } = await authClient.apiKey.create({
			name: `Chave gerada em ${new Date().toLocaleDateString("pt-BR")}`,
		});
		setCreating(false);
		if (error || !data) return;
		setCreatedKey(data.key);
		await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
	}

	async function handleDeleteKey(keyId: string): Promise<void> {
		await authClient.apiKey.delete({ keyId });
		await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
	}

	return (
		<PageLayout>
			<section className="mx-auto max-w-2xl px-4 py-16" ref={copyButtonsRef}>
				<h1 className="text-3xl font-bold">API para desenvolvedores</h1>
				<p className="mt-2 text-sm text-(--color-fg-muted)">
					Acesse suas transações programaticamente com um token de API — CRUD completo, mesma conta, mesmos
					dados que você vê no dashboard.
				</p>

				<div className="mt-8 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
					<h2 className="text-lg font-semibold">Seu token</h2>
					<p className="mt-2 text-sm text-(--color-fg-muted)">
						Gere um token e use-o no header <code>x-api-key: &lt;token&gt;</code> em toda requisição.
					</p>

					{createdKey && (
						<div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
							<p className="text-xs font-medium text-emerald-700">
								Copie agora — por segurança, esse token não será mostrado de novo.
							</p>
							<div className="mt-2 flex items-center gap-2">
								<code className="flex-1 overflow-x-auto text-xs">{createdKey}</code>
								<button
									type="button"
									data-clipboard-text={createdKey}
									className="shrink-0 rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-medium hover:bg-brand-500/10"
								>
									Copiar
								</button>
							</div>
						</div>
					)}

					<button
						type="button"
						onClick={handleCreateKey}
						disabled={creating}
						className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
					>
						{creating ? "Gerando..." : "Gerar novo token"}
					</button>

					{keysQuery.data && keysQuery.data.length > 0 && (
						<ul className="mt-5 flex flex-col gap-2 border-t border-(--color-border) pt-4">
							{keysQuery.data.map((key) => (
								<li key={key.id} className="flex items-center justify-between text-sm">
									<span>
										{key.name ?? "Sem nome"} ·{" "}
										<code className="text-(--color-fg-muted)">{key.start}…</code>
									</span>
									<button
										type="button"
										onClick={() => handleDeleteKey(key.id)}
										className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
									>
										Revogar
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
					<h2 className="text-lg font-semibold">Tipagem</h2>
					<div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-(--color-bg-subtle) p-3">
						<pre className="overflow-x-auto text-xs">{TRANSACTION_DTO_TYPE}</pre>
						<button
							type="button"
							data-clipboard-text={TRANSACTION_DTO_TYPE}
							className="shrink-0 rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
						>
							Copiar
						</button>
					</div>
				</div>

				<div className="mt-6 flex flex-col gap-4">
					{ENDPOINTS.map((endpoint) => {
						const hasBody = endpoint.body !== null;
						const fetchExample = buildFetchExample(endpoint.method, endpoint.path, hasBody);
						const curlExample = buildCurlExample(endpoint.method, endpoint.path, hasBody);
						return (
							<div
								key={`${endpoint.method}-${endpoint.path}`}
								className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6"
							>
								<div className="flex items-center gap-2">
									<span className="rounded bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600">
										{endpoint.method}
									</span>
									<code className="text-sm font-medium">{endpoint.path}</code>
								</div>
								<p className="mt-2 text-sm text-(--color-fg-muted)">{endpoint.description}</p>

								{endpoint.query && (
									<div className="mt-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-(--color-fg-muted)">
											Query
										</p>
										<ul className="mt-1.5 flex flex-col gap-1">
											{endpoint.query.split(" · ").map((param) => (
												<li
													key={param}
													className="overflow-x-auto rounded-lg bg-(--color-bg-subtle) px-3 py-1.5 font-mono text-xs"
												>
													{param}
												</li>
											))}
										</ul>
									</div>
								)}

								{endpoint.body && (
									<div className="mt-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-(--color-fg-muted)">
											Body
										</p>
										<pre className="mt-1.5 overflow-x-auto rounded-lg bg-(--color-bg-subtle) p-3 font-mono text-xs">
											{endpoint.body}
										</pre>
									</div>
								)}

								<div className="mt-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-(--color-fg-muted)">
										Response
									</p>
									<pre className="mt-1.5 overflow-x-auto rounded-lg bg-(--color-bg-subtle) p-3 font-mono text-xs">
										{endpoint.response}
									</pre>
								</div>

								<div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-(--color-bg-subtle) p-3">
									<pre className="overflow-x-auto text-xs">{fetchExample}</pre>
									<button
										type="button"
										data-clipboard-text={fetchExample}
										className="shrink-0 rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
									>
										Copiar
									</button>
								</div>
								<div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-(--color-bg-subtle) p-3">
									<pre className="overflow-x-auto text-xs">{curlExample}</pre>
									<button
										type="button"
										data-clipboard-text={curlExample}
										className="shrink-0 rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
									>
										Copiar
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			<Toast message={toastMessage} />
		</PageLayout>
	);
}
