// Plain `html2canvas` doesn't understand modern color functions like
// `oklch()`/`lab()` — which is how Tailwind CSS v4 emits this project's
// colors — and throws "Attempting to parse an unsupported color function".
// The `html2canvas-pro` fork exists precisely to support them.
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
