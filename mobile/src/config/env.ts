import { z } from "zod";

// Config pública em runtime. Só variáveis `EXPO_PUBLIC_*` chegam ao bundle
// (inlined em build time). Validada uma vez pra o resto do app poder assumir
// um formato bom. Sem EXPO_PUBLIC_API_URL o app não sabe onde é o backend —
// falha cedo em vez de quebrar silenciosamente em cada chamada.
const schema = z.object({
	apiUrl: z.url(),
});

const parsed = schema.safeParse({
	apiUrl: process.env.EXPO_PUBLIC_API_URL,
});

if (!parsed.success) {
	throw new Error(
		`Config inválida (EXPO_PUBLIC_*): ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
	);
}

export const env = parsed.data;
