import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { signOut, useSession } from "../lib/auth-client";

export function SiteHeader({ actions }: { actions?: ReactNode }) {
	const { data: session, isPending } = useSession();
	const navigate = useNavigate();

	async function handleSignOut(): Promise<void> {
		await signOut();
		await navigate({ to: "/" });
	}

	return (
		<header className="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-bg)/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
				<Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
					<span className="inline-block size-2.5 rounded-full bg-brand-500" aria-hidden="true" />
					Elysia Finanças
				</Link>

				{actions ? (
					<div className="flex items-center gap-3">{actions}</div>
				) : (
					<>
						<nav className="hidden items-center gap-6 text-sm font-medium text-(--color-fg-muted) sm:flex">
							<Link
								to="/"
								className="hover:text-(--color-fg)"
								activeProps={{ className: "text-(--color-fg)" }}
							>
								Início
							</Link>
							<Link
								to="/contato"
								className="hover:text-(--color-fg)"
								activeProps={{ className: "text-(--color-fg)" }}
							>
								Contato
							</Link>
						</nav>

						<div className="flex items-center gap-2">
							{!isPending && session ? (
								<>
									<Link
										to="/dashboard"
										className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--color-fg) hover:bg-brand-500/10"
									>
										Dashboard
									</Link>
									<button
										type="button"
										onClick={handleSignOut}
										className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-fg) hover:bg-brand-500/10"
									>
										Sair
									</button>
								</>
							) : (
								!isPending && (
									<>
										<Link
											to="/entrar"
											className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--color-fg) hover:bg-brand-500/10"
										>
											Entrar
										</Link>
										<Link
											to="/criar-conta"
											className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-600"
										>
											Criar conta
										</Link>
									</>
								)
							)}
						</div>
					</>
				)}
			</div>
		</header>
	);
}
