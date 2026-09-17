import { Link, useNavigate } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "../lib/auth-client";
import { ThemeToggle } from "./theme-toggle";

export function UserMenu({ name }: { name: string }) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent): void {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	async function handleSignOut(): Promise<void> {
		await signOut();
		await navigate({ to: "/" });
	}

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={name}
				className="flex items-center gap-2 rounded-lg border border-(--color-border) p-2 text-sm font-medium hover:bg-brand-500/10 sm:px-3 sm:py-1.5"
			>
				<User className="size-4 shrink-0 sm:hidden" aria-hidden="true" />
				<span className="hidden sm:inline">{name}</span>
				<span aria-hidden="true" className="hidden sm:inline">
					▾
				</span>
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg"
				>
					<Link
						to="/minha-conta"
						role="menuitem"
						onClick={() => setOpen(false)}
						className="block px-4 py-2 text-sm hover:bg-brand-500/10"
					>
						Minha Conta
					</Link>
					<Link
						to="/api"
						role="menuitem"
						onClick={() => setOpen(false)}
						className="block px-4 py-2 text-sm hover:bg-brand-500/10"
					>
						API
					</Link>
					<div className="flex items-center justify-between px-4 py-2 text-sm">
						<span>Tema</span>
						<ThemeToggle />
					</div>
					<hr className="my-1 border-(--color-border)" />
					<button
						type="button"
						role="menuitem"
						onClick={handleSignOut}
						className="block w-full px-4 py-2 text-left text-sm hover:bg-brand-500/10"
					>
						Sair
					</button>
				</div>
			)}
		</div>
	);
}
