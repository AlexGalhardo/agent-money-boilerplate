import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "../components/site-footer";
import { useIsDarkTheme } from "../components/theme-toggle";
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
	// only mirrors the current state (a past bug hardcoded "dark" on the div,
	// so the toggle had no visual effect).
	const isDark = useIsDarkTheme();

	return (
		<div
			className={`${isDark ? "dark" : ""} relative flex h-dvh w-dvw flex-col overflow-hidden bg-(--color-bg) text-(--color-fg)`}
		>
			<header className="flex items-center justify-between px-6 py-5 sm:px-10">
				<div className="mx-auto flex w-full max-w-7xl items-center justify-between">
					<span className="flex items-center gap-2 text-lg font-bold tracking-tight">
						<img src="/favicon.svg" alt="" aria-hidden="true" className="size-5" />
						Money
					</span>
					<div className="flex items-center gap-2">
						<Link
							to="/entrar"
							className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-brand-500/10"
						>
							Entrar
						</Link>
						<Link
							to="/criar-conta"
							className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-600"
						>
							Criar conta
						</Link>
					</div>
				</div>
			</header>

			<main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 items-center justify-center overflow-hidden px-4 sm:px-10">
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

			<SiteFooter />
		</div>
	);
}
