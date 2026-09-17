import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./theme-toggle";

export function SiteFooter() {
	return (
		<footer className="border-t border-(--color-border) py-8 text-xs text-(--color-fg-muted) sm:text-sm">
			<div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
				<p className="whitespace-nowrap">© {new Date().getFullYear()} Money. Todos os direitos reservados.</p>
				<nav className="flex items-center gap-2 sm:gap-4">
					<Link to="/contato" className="whitespace-nowrap hover:text-(--color-fg)">
						Contato
					</Link>
					<Link to="/termos-de-uso" className="whitespace-nowrap hover:text-(--color-fg)">
						Termos de Uso
					</Link>
					<Link to="/politica-de-privacidade" className="whitespace-nowrap hover:text-(--color-fg)">
						Política de Privacidade
					</Link>
					<ThemeToggle />
				</nav>
			</div>
		</footer>
	);
}
