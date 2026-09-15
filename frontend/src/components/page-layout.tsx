import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageLayout({ children, headerActions }: { children: ReactNode; headerActions?: ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader actions={headerActions} />
			<main className="flex-1">{children}</main>
			<SiteFooter />
		</div>
	);
}
