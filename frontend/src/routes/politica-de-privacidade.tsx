import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "../components/page-layout";

export const Route = createFileRoute("/politica-de-privacidade")({
	head: () => ({
		meta: [
			{ title: "Política de privacidade — Elysia Finanças" },
			{ name: "description", content: "Como a Elysia Finanças trata seus dados pessoais e financeiros." },
		],
	}),
	component: PrivacyPage,
});

function PrivacyPage() {
	return (
		<PageLayout>
			<section className="mx-auto max-w-3xl px-4 py-16">
				<h1 className="text-3xl font-bold">Política de privacidade</h1>
				<p className="mt-2 text-sm text-(--color-fg-muted)">Última atualização: setembro de 2026.</p>

				<div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-(--color-fg-muted)">
					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">1. Dados coletados</h2>
						<p className="mt-2">
							Coletamos seu nome, e-mail e as transações financeiras que você cadastra manualmente. Não
							acessamos contas bancárias externas.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">2. Criptografia</h2>
						<p className="mt-2">
							A descrição e o valor de cada transação são criptografados (AES-256-GCM) antes de serem
							gravados no banco de dados, e só são descriptografados para você mesmo, autenticado.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">3. Compartilhamento</h2>
						<p className="mt-2">
							Não vendemos nem compartilhamos seus dados com terceiros, exceto processadores essenciais ao
							serviço (ex.: AbacatePay para pagamentos via PIX, Resend para e-mails transacionais).
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">4. Seus direitos</h2>
						<p className="mt-2">
							Você pode atualizar seus dados a qualquer momento em "Minha conta" e solicitar a exclusão
							completa da sua conta, respeitada a ausência de plano ativo.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">5. Contato</h2>
						<p className="mt-2">
							Dúvidas sobre privacidade podem ser enviadas pela nossa página de contato.
						</p>
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
