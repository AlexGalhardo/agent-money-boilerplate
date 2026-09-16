import { createFileRoute, Link } from "@tanstack/react-router";
import { MatrixRain } from "../components/matrix-rain";
import { ThemeToggle, useIsDarkTheme } from "../components/theme-toggle";
import { redirectIfAuthenticated } from "../lib/redirect-if-authenticated";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Money — Suas finanças no Telegram" },
			{
				name: "description",
				content:
					"Controle suas finanças direto pelo Telegram: registre transações e acompanhe seus gastos por lá.",
			},
		],
	}),
	beforeLoad: redirectIfAuthenticated,
	component: Home,
});

function Home() {
	// A landing segue o tema global (claro/escuro) como o resto do app —
	// o toggle no footer aplica a classe "dark" no <html>, e essa classe
	// aqui só espelha o estado atual (ver bug corrigido: antes ficava sempre
	// "dark" fixo na div, então o toggle não tinha efeito visual nenhum).
	const isDark = useIsDarkTheme();

	return (
		<div
			className={`${isDark ? "dark" : ""} relative flex h-dvh w-dvw flex-col overflow-hidden bg-(--color-bg) text-(--color-fg)`}
		>
			<MatrixRain className="pointer-events-none absolute inset-0 -z-10" />

			<header className="flex items-center justify-between px-6 py-5 sm:px-10">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between">
					<span className="flex items-center gap-2 text-lg font-bold tracking-tight">
						<img src="/favicon.svg" alt="" aria-hidden="true" className="size-5" />
						Money
					</span>
					<Link
						to="/entrar"
						className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-brand-500/10"
					>
						Entrar
					</Link>
				</div>
			</header>

			<main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center overflow-hidden px-4 sm:px-10">
				<div className="mx-auto w-full text-center lg:w-1/2">
					<h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
						<span className="block bg-gradient-to-r from-brand-300 via-brand-500 to-brand-700 bg-clip-text text-transparent">
							Suas finanças.
						</span>
						<span className="block text-orange-500">Na web.</span>
						<span className="block text-blue-500">E no Telegram.</span>
					</h1>
				</div>
			</main>

			<footer className="flex items-center justify-between px-6 py-5 text-sm text-(--color-fg-muted) sm:px-10">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between">
					<p>© {new Date().getFullYear()} Money.</p>
					<nav className="flex items-center gap-4">
						<Link to="/contato" className="hover:text-(--color-fg)">
							Contato
						</Link>
						<Link to="/politica-de-privacidade" className="hover:text-(--color-fg)">
							Política de Privacidade
						</Link>
						<Link to="/termos-de-uso" className="hover:text-(--color-fg)">
							Termos de Uso
						</Link>
						<ThemeToggle />
					</nav>
				</div>
			</footer>
		</div>
	);
}
