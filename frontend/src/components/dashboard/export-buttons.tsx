import { FileDown } from "lucide-react";

type Props = {
	disabled: boolean;
	exportingPdf: boolean;
	onXlsx: () => void;
	onCsv: () => void;
	onPdf: () => void;
};

const buttonClassName =
	"flex items-center gap-1.5 rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-medium hover:bg-brand-500/10 disabled:opacity-40";

export function ExportButtons({ disabled, exportingPdf, onXlsx, onCsv, onPdf }: Props) {
	return (
		<div className="flex gap-2">
			<button type="button" disabled={disabled} onClick={onXlsx} className={buttonClassName}>
				Exportar .xlsx
			</button>
			<button type="button" disabled={disabled} onClick={onCsv} className={buttonClassName}>
				Exportar .csv
			</button>
			<button type="button" disabled={exportingPdf} onClick={onPdf} className={buttonClassName}>
				<FileDown className="size-3.5 shrink-0" aria-hidden="true" />
				{exportingPdf ? "Gerando..." : "Exportar .pdf"}
			</button>
		</div>
	);
}
