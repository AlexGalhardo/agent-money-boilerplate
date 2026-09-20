import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageLayout } from "./page-layout";

const REDIRECT_SECONDS = 5;

export function NotFoundPage() {
	const navigate = useNavigate();
	const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

	useEffect(() => {
		const interval = setInterval(() => {
			setSecondsLeft((current) => current - 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (secondsLeft <= 0) navigate({ to: "/" });
	}, [secondsLeft, navigate]);

	return (
		<PageLayout>
			<section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
				<h1 className="text-6xl font-bold text-brand-500">404</h1>
				<p className="mt-4 text-xl font-semibold">Essa página não existe.</p>
				<p className="mt-2 text-(--color-fg-muted)">
					Você será redirecionado para a página inicial em {secondsLeft} segundo{secondsLeft === 1 ? "" : "s"}
					...
				</p>
				<Link
					to="/"
					className="mt-6 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-black hover:bg-brand-400"
				>
					Ir para a página inicial agora
				</Link>
			</section>
		</PageLayout>
	);
}
