import { authClient } from "../lib/auth-client";

export function GoogleButton({ label, callbackURL = "/dashboard" }: { label: string; callbackURL?: string }) {
	async function handleClick(): Promise<void> {
		await authClient.signIn.social({ provider: "google", callbackURL });
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className="flex w-full items-center justify-center gap-2 rounded-lg border border-(--color-border) bg-(--color-bg) px-4 py-2.5 text-sm font-medium hover:bg-brand-500/10"
		>
			<svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
				<path
					fill="#4285F4"
					d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z"
				/>
				<path
					fill="#34A853"
					d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"
				/>
				<path
					fill="#FBBC05"
					d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38z"
				/>
				<path
					fill="#EA4335"
					d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
				/>
			</svg>
			{label}
		</button>
	);
}
