import type { LucideIcon } from "lucide-react";
import { ArrowDownCircle, ArrowUpCircle, Upload } from "lucide-react";
import { UserMenu } from "../user-menu";

type Props = {
	disabled: boolean;
	userName: string;
	onImport: () => void;
	onAdd: (type: "income" | "expense") => void;
};

type ActionButtonProps = {
	label: string;
	icon: LucideIcon;
	className: string;
	disabled: boolean;
	onClick: () => void;
};

function ActionButton({ label, icon: Icon, className, disabled, onClick }: ActionButtonProps) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			aria-label={label}
			title={label}
			className={`flex items-center gap-2 rounded-lg p-2 text-sm font-semibold text-white disabled:opacity-40 sm:px-3 sm:py-1.5 ${className}`}
		>
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			<span className="hidden sm:inline">{label}</span>
		</button>
	);
}

export function DashboardActions({ disabled, userName, onImport, onAdd }: Props) {
	return (
		<>
			<ActionButton
				label="Importar"
				icon={Upload}
				disabled={disabled}
				onClick={onImport}
				className="bg-[#820AD1] hover:bg-[#9a1df0]"
			/>
			<ActionButton
				label="Adicionar Receita"
				icon={ArrowUpCircle}
				disabled={disabled}
				onClick={() => onAdd("income")}
				className="bg-emerald-500 hover:bg-emerald-400"
			/>
			<ActionButton
				label="Adicionar Despesa"
				icon={ArrowDownCircle}
				disabled={disabled}
				onClick={() => onAdd("expense")}
				className="bg-red-500 hover:bg-red-400"
			/>
			<UserMenu name={userName} />
		</>
	);
}
