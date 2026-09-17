import { useEffect, useState } from "react";

const TOAST_DURATION_MS = 2000;

export function useToast() {
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!message) return;
		const timer = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
		return () => clearTimeout(timer);
	}, [message]);

	return { message, showToast: setMessage };
}

export function Toast({ message }: { message: string | null }) {
	if (!message) return null;

	return (
		<div
			role="status"
			className="toast-in fixed right-4 top-4 z-50 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-sm font-medium text-(--color-fg) shadow-lg"
		>
			{message}
		</div>
	);
}
