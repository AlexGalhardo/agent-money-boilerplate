import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "../lib/auth-client";
import { UserMenu } from "./user-menu";

export function SiteHeader({ actions, titleBadge }: { actions?: ReactNode; titleBadge?: ReactNode }) {
	const { data: session, isPending } = useSession();

	return (
		<header className="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-bg)/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
				<div className="flex items-center gap-3">
					<Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
						<img src="/favicon.svg" alt="" aria-hidden="true" className="size-5" />
						Money
					</Link>
					{titleBadge}
				</div>

				{actions ? (
					<div className="flex items-center gap-3">{actions}</div>
				) : (
					<div className="flex items-center gap-2">
						{!isPending && session ? (
							<UserMenu name={session.user.name} />
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
				)}
			</div>
		</header>
	);
}
