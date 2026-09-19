// `html2canvas` (sem sufixo) não entende funções de cor modernas como
// `oklch()`/`lab()` — que é como o Tailwind CSS v4 gera as cores deste
// projeto — e lança "Attempting to parse an unsupported color function" ao
// capturar qualquer elemento estilizado com ele. O fork `html2canvas-pro` é
// mantido justamente para suportar essas funções de cor.
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportSummaryToPdf(element: HTMLElement): Promise<void> {
	const canvas = await html2canvas(element, {
		backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
		scale: 2,
	});

	const imageData = canvas.toDataURL("image/png");
	const pdf = new jsPDF({
		orientation: canvas.width > canvas.height ? "landscape" : "portrait",
		unit: "px",
		format: [canvas.width, canvas.height],
	});

	pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
	pdf.save("resumo-financeiro.pdf");
}
