import { useEffect, useRef } from "react";
import { useIsDarkTheme } from "./theme-toggle";

const GLYPHS = ["$", "R$"];
const FONT_SIZE = 16;
const FRAME_INTERVAL_MS = 60;

export function MatrixRain({ className }: { className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDark = useIsDarkTheme();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let columns = 0;
		let drops: number[] = [];

		function resize(): void {
			if (!canvas) return;
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
			columns = Math.floor(canvas.width / FONT_SIZE);
			drops = Array.from({ length: columns }, () => Math.floor((Math.random() * canvas.height) / FONT_SIZE));
		}

		resize();
		window.addEventListener("resize", resize);

		const fadeColor = isDark ? "rgba(10, 12, 10, 0.08)" : "rgba(250, 250, 249, 0.14)";
		const glyphColor = isDark ? "#22c55e" : "#0f7a3d";

		function draw(): void {
			if (!ctx || !canvas) return;
			ctx.fillStyle = fadeColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = glyphColor;
			ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;

			for (let column = 0; column < drops.length; column++) {
				const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "$";
				const x = column * FONT_SIZE;
				const y = (drops[column] ?? 0) * FONT_SIZE;
				ctx.fillText(glyph, x, y);

				if (y > canvas.height && Math.random() > 0.975) {
					drops[column] = 0;
				} else {
					drops[column] = (drops[column] ?? 0) + 1;
				}
			}
		}

		const interval = window.setInterval(draw, FRAME_INTERVAL_MS);
		return () => {
			window.clearInterval(interval);
			window.removeEventListener("resize", resize);
		};
	}, [isDark]);

	return <canvas ref={canvasRef} className={className} />;
}
