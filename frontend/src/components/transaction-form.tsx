import { useState } from "react";
import { z } from "zod";
import type { TransactionCategory } from "../lib/categories";
import { categoryLabels, categoryOptions } from "../lib/categories";
import { FormField } from "./auth-card";

const categoryTuple = categoryOptions as [TransactionCategory, ...TransactionCategory[]];

export const transactionFormSchema = z.object({
	description: z
		.string()
		.trim()
		.min(4, "A descrição precisa ter pelo menos 4 caracteres")
		.max(32, "A descrição pode ter no máximo 32 caracteres"),
	amount: z.coerce.number().positive("Informe um valor maior que zero"),
	category: z.enum(categoryTuple),
	type: z.enum(["income", "expense"]),
	date: z.string().min(1, "Informe a data da transação"),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export type TransactionFormInitial = {
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
};

export type TransactionFormSubmitValues = {
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
};

const colorSchemes = {
	income: {
		input: "border-emerald-500/60 bg-(--color-bg) focus:border-emerald-500",
		badge: "bg-emerald-500/10 text-emerald-600",
		button: "bg-emerald-500 hover:bg-emerald-400",
	},
	expense: {
		input: "border-red-500/60 bg-(--color-bg) focus:border-red-500",
		badge: "bg-red-500/10 text-red-500",
		button: "bg-red-500 hover:bg-red-400",
	},
} as const;

function toDateInputValue(iso: string | Date): string {
	return new Date(iso).toISOString().slice(0, 10);
}

function centsToDisplay(cents: number): string {
	return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransactionForm({
	initial,
	fixedType,
	submitLabel,
	loading,
	onSubmit,
}: {
	initial?: TransactionFormInitial;
	fixedType?: "income" | "expense";
	submitLabel: string;
	loading: boolean;
	onSubmit: (values: TransactionFormSubmitValues) => void;
}) {
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [type, setType] = useState<"income" | "expense">(fixedType ?? initial?.type ?? "expense");
	const [amountCents, setAmountCents] = useState(initial?.amount ?? 0);
	const scheme = colorSchemes[type];
	const inputClassName = `w-full rounded-lg border px-3 py-2 outline-none ${scheme.input}`;

	function handleAmountChange(event: React.ChangeEvent<HTMLInputElement>): void {
		const digitsOnly = event.target.value.replace(/\D/g, "");
		setAmountCents(digitsOnly ? Number.parseInt(digitsOnly, 10) : 0);
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const result = transactionFormSchema.safeParse({
			description: formData.get("description"),
			amount: amountCents / 100,
			category: formData.get("category"),
			type,
			date: formData.get("date"),
		});

		if (!result.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const key = issue.path[0];
				if (typeof key === "string") fieldErrors[key] = issue.message;
			}
			setErrors(fieldErrors);
			return;
		}

		setErrors({});
		onSubmit({
			description: result.data.description,
			amount: Math.round(result.data.amount * 100),
			category: result.data.category,
			type: result.data.type,
			date: new Date(`${result.data.date}T12:00:00.000Z`).toISOString(),
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
			{!fixedType && (
				<FormField label="Tipo" id="type" error={errors.type}>
					<select
						id="type"
						value={type}
						onChange={(event) => setType(event.target.value as "income" | "expense")}
						className={inputClassName}
					>
						<option value="expense">Despesa</option>
						<option value="income">Receita</option>
					</select>
				</FormField>
			)}

			<FormField label="Descrição" id="description" error={errors.description}>
				<input
					id="description"
					name="description"
					type="text"
					minLength={4}
					maxLength={32}
					defaultValue={initial?.description}
					onInput={(event) => {
						event.currentTarget.value = event.currentTarget.value.toUpperCase();
					}}
					className={`${inputClassName} uppercase`}
				/>
			</FormField>

			<FormField label="Valor" id="amount" error={errors.amount}>
				<div className="flex items-stretch gap-2">
					<span
						className={`flex w-9 shrink-0 items-center justify-center rounded-lg font-bold ${scheme.badge}`}
						aria-hidden="true"
					>
						{type === "income" ? "+" : "−"}
					</span>
					<input
						type="text"
						disabled
						value="R$"
						aria-label="Reais"
						className="w-12 shrink-0 rounded-lg border border-(--color-border) bg-(--color-bg-subtle) text-center text-sm text-(--color-fg-muted)"
					/>
					<input
						id="amount"
						type="text"
						inputMode="numeric"
						value={centsToDisplay(amountCents)}
						onChange={handleAmountChange}
						className={inputClassName}
					/>
				</div>
			</FormField>

			<FormField label="Categoria" id="category" error={errors.category}>
				<select
					id="category"
					name="category"
					defaultValue={initial?.category ?? "food"}
					className={inputClassName}
				>
					{categoryOptions.map((category) => (
						<option key={category} value={category}>
							{categoryLabels[category]}
						</option>
					))}
				</select>
			</FormField>

			<FormField label="Data da transação" id="date" error={errors.date}>
				<input
					id="date"
					name="date"
					type="date"
					defaultValue={initial ? toDateInputValue(initial.date) : toDateInputValue(new Date().toISOString())}
					className={inputClassName}
				/>
			</FormField>

			<button
				type="submit"
				disabled={loading}
				className={`mt-2 rounded-lg px-4 py-2.5 font-semibold text-black disabled:opacity-60 ${scheme.button}`}
			>
				{loading ? "Salvando..." : submitLabel}
			</button>
		</form>
	);
}
