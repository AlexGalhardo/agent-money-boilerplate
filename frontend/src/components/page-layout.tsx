import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageLayout({
	children,
	headerActions,
	headerTitleBadge,
}: {
	children: ReactNode;
	headerActions?: ReactNode;
	headerTitleBadge?: ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader actions={headerActions} titleBadge={headerTitleBadge} />
			<main className="flex-1">{children}</main>
			<SiteFooter />
		</div>
	);
}
