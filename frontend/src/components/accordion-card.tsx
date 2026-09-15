import type { ReactNode } from "react";

export function AccordionCard({
	title,
	defaultOpen,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	return (
		<details
			open={defaultOpen}
			className="group rounded-2xl border border-(--color-border) bg-(--color-surface) p-6"
		>
			<summary className="flex cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
				{title}
				<span aria-hidden="true" className="transition-transform group-open:rotate-180">
					▾
				</span>
			</summary>
			<div className="mt-4">{children}</div>
		</details>
	);
}
