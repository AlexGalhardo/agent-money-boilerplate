// Explicit stylesheet import: the package declares itself side-effect free,
// so the bundler tree-shakes the component's own `import "./style.css"` and
// the reference renders unstyled. Lazy-loaded by routes/api.tsx, so this
// CSS ships only with that page.
import "@scalar/api-reference-react/style.css";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import { useIsDarkTheme } from "./theme-toggle";

// Served by the backend (@elysiajs/openapi, generated from the routes' Zod
// schemas) and proxied like every other API path — see proxy-paths.ts.
const OPENAPI_SPEC_PATH = "/openapi/json";

export default function ApiReference({ token }: { token: string | null }) {
	const isDark = useIsDarkTheme();

	return (
		<ApiReferenceReact
			configuration={{
				url: OPENAPI_SPEC_PATH,
				// "Test request" goes through this frontend's proxy.
				servers: [{ url: window.location.origin, description: "Esta instância" }],
				authentication: {
					preferredSecurityScheme: "apiKey",
					...(token ? { securitySchemes: { apiKey: { value: token } } } : {}),
				},
				forceDarkModeState: isDark ? "dark" : "light",
				hideDarkModeToggle: true,
				// Scalar's default fonts come from its CDN, which the CSP blocks.
				withDefaultFonts: false,
				hideClientButton: true,
				documentDownloadType: "json",
				// Embedded in a page with its own header: no full-height sidebar.
				layout: "classic",
				// Cloud features would send the spec (and requests) to Scalar's
				// servers — this page stays self-contained.
				agent: { disabled: true },
				mcp: { disabled: true },
				telemetry: false,
			}}
		/>
	);
}
