import type { ErrorComponentProps } from "@tanstack/react-router";
import { PageLayout } from "./page-layout";

/** Router-level error boundary: never shows the raw error to the user (it's logged instead). */
export function ErrorPage({ error, reset }: ErrorComponentProps) {
	console.error(error);

	return (
		<PageLayout>
			<section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
				<h1 className="text-3xl font-bold">Algo deu errado.</h1>
				<p className="mt-2 text-(--color-fg-muted)">Tente novamente em instantes.</p>
				<button
					type="button"
					onClick={reset}
					className="mt-6 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-black hover:bg-brand-400"
				>
					Tentar novamente
				</button>
			</section>
		</PageLayout>
	);
}
