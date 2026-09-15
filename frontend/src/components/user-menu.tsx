import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { signOut } from "../lib/auth-client";

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
				className="flex items-center gap-2 rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-medium hover:bg-brand-500/10"
			>
				{name}
				<span aria-hidden="true">▾</span>
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg"
				>
					<Link
						to="/minha-conta"
						role="menuitem"
						onClick={() => setOpen(false)}
						className="block px-4 py-2 text-sm hover:bg-brand-500/10"
					>
						Minha Conta
					</Link>
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
