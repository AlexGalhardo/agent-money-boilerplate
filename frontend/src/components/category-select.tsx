import { useEffect, useRef, useState } from "react";
import type { TransactionCategory } from "../lib/categories";
import { categoryLabels } from "../lib/categories";
import { CategoryIcon } from "../lib/category-icons";

export function CategorySelect({
	id,
	value,
	options,
	onChange,
	placeholder,
}: {
	id: string;
	value: TransactionCategory | "";
	options: TransactionCategory[];
	onChange: (value: TransactionCategory | "") => void;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent): void {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const selectedLabel = value ? categoryLabels[value] : (placeholder ?? "Selecione");

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				id={id}
				onClick={() => setOpen((current) => !current)}
				aria-haspopup="listbox"
				aria-expanded={open}
				className="flex w-full items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-left text-sm outline-none focus:border-brand-500"
			>
				{value && <CategoryIcon category={value} className="size-4 shrink-0" />}
				<span className="flex-1 truncate">{selectedLabel}</span>
				<span aria-hidden="true" className="text-(--color-fg-muted)">
					▾
				</span>
			</button>

			{open && (
				<div
					role="listbox"
					className="absolute z-10 mt-1 max-h-64 w-full min-w-[200px] overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg"
				>
					{placeholder && (
						<button
							type="button"
							role="option"
							aria-selected={value === ""}
							onClick={() => {
								onChange("");
								setOpen(false);
							}}
							className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-500/10"
						>
							{placeholder}
						</button>
					)}
					{options.map((category) => (
						<button
							key={category}
							type="button"
							role="option"
							aria-selected={value === category}
							onClick={() => {
								onChange(category);
								setOpen(false);
							}}
							className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-500/10"
						>
							<CategoryIcon category={category} className="size-4 shrink-0" />
							{categoryLabels[category]}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
