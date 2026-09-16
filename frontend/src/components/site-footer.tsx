import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./theme-toggle";

export function SiteFooter() {
	return (
		<footer className="border-t border-(--color-border) py-8 text-sm text-(--color-fg-muted)">
			<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
				<p>© {new Date().getFullYear()} Money. Todos os direitos reservados.</p>
				<nav className="flex items-center gap-4">
					<Link to="/termos-de-uso" className="hover:text-(--color-fg)">
						Termos de uso
					</Link>
					<Link to="/politica-de-privacidade" className="hover:text-(--color-fg)">
						Privacidade
					</Link>
					<Link to="/contato" className="hover:text-(--color-fg)">
						Contato
					</Link>
					<ThemeToggle />
				</nav>
			</div>
		</footer>
	);
}
