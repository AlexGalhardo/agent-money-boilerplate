import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getStoredTheme(): Theme | null {
	if (typeof window === "undefined") return null;
	const stored = window.localStorage.getItem("theme");
	return stored === "light" || stored === "dark" ? stored : null;
}

function applyTheme(theme: Theme): void {
	document.documentElement.classList.toggle("dark", theme === "dark");
	window.localStorage.setItem("theme", theme);
	window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}

export function useIsDarkTheme(): boolean {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));

		function handleThemeChange(event: Event): void {
			setIsDark((event as CustomEvent<Theme>).detail === "dark");
		}

		window.addEventListener("themechange", handleThemeChange);
		return () => window.removeEventListener("themechange", handleThemeChange);
	}, []);

	return isDark;
}

export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("dark");

	useEffect(() => {
		const stored = getStoredTheme();
		const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
		setTheme(initial);
	}, []);

	function toggle(): void {
		const next: Theme = theme === "dark" ? "light" : "dark";
		setTheme(next);
		applyTheme(next);
	}

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
			className="inline-flex size-9 items-center justify-center rounded-lg border border-(--color-border) text-(--color-fg) transition-colors hover:bg-brand-500/10"
		>
			{theme === "dark" ? "☀️" : "🌙"}
		</button>
	);
}

export const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;
