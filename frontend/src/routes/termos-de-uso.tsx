import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "../components/page-layout";

export const Route = createFileRoute("/termos-de-uso")({
	head: () => ({
		meta: [
			{ title: "Termos de uso — Elysia Finanças" },
			{ name: "description", content: "Termos de uso da Elysia Finanças." },
		],
	}),
	component: TermsPage,
});

function TermsPage() {
	return (
		<PageLayout>
			<section className="mx-auto max-w-3xl px-4 py-16">
				<h1 className="text-3xl font-bold">Termos de uso</h1>
				<p className="mt-2 text-sm text-(--color-fg-muted)">Última atualização: setembro de 2026.</p>

				<div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-(--color-fg-muted)">
					<p>
						Ao criar uma conta e usar a Elysia Finanças, você concorda com estes termos. Se não concordar,
						não utilize o serviço.
					</p>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">1. Uso do serviço</h2>
						<p className="mt-2">
							A Elysia Finanças é uma ferramenta de controle financeiro pessoal. Você é responsável pela
							veracidade dos dados inseridos e pela guarda das credenciais da sua conta.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">2. Assinatura e pagamento</h2>
						<p className="mt-2">
							O plano anual é cobrado conforme exibido no momento da contratação. Cancelamentos seguem a
							política descrita na área de conta.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">3. Conta e exclusão</h2>
						<p className="mt-2">
							Você pode excluir sua conta a qualquer momento, desde que não haja plano ativo em vigor. A
							exclusão é permanente e remove seus dados conforme nossa Política de Privacidade.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">4. Limitação de responsabilidade</h2>
						<p className="mt-2">
							A Elysia Finanças é fornecida "como está". Não nos responsabilizamos por decisões
							financeiras tomadas com base nos dados do serviço.
						</p>
					</div>

					<div>
						<h2 className="text-base font-semibold text-(--color-fg)">5. Alterações</h2>
						<p className="mt-2">
							Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas por
							e-mail.
						</p>
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
