import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { themeInitScript } from "../components/theme-toggle";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{
				name: "description",
				content: "Controle suas finanças pessoais: transações, categorias e relatórios em um só lugar.",
			},
			{ title: "Elysia Finanças" },
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const { queryClient } = Route.useRouteContext();

	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<head>
				<HeadContent />
				{/** biome-ignore lint/security/noDangerouslySetInnerHtml: script inline necessário para evitar flash de tema errado antes da hidratação */}
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body suppressHydrationWarning>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{ position: "bottom-left" }}
						plugins={[
							{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
