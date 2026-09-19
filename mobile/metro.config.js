const Module = require("node:module");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

// bunfig.toml usa o linker "hoisted" (obrigatório pro Metro funcionar nesse
// monorepo, ver comentário lá). Efeito colateral: o nativewind (só o
// mobile/ depende dele) fica hoisted na raiz, e o `require("tailwindcss")`
// que ele faz internamente resolve a partir de node_modules/nativewind na
// RAIZ — encontrando o tailwindcss v4 do frontend/ (@tailwindcss/vite) em
// vez do v3 que o nativewind exige (só existe nested em
// mobile/node_modules/tailwindcss). Intercepta a resolução desse único
// módulo antes de carregar o plugin do nativewind, forçando a cópia local
// v3 — não afeta nenhum outro workspace, só a configuração do Metro aqui.
const localTailwind = path.resolve(projectRoot, "node_modules/tailwindcss");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, ...rest) {
	if (request === "tailwindcss" || request.startsWith("tailwindcss/")) {
		return originalResolveFilename.call(this, request.replace("tailwindcss", localTailwind), ...rest);
	}
	return originalResolveFilename.call(this, request, ...rest);
};

const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(projectRoot);

// Metro por padrão transforma arquivos em worker_threads separados, que NÃO
// herdam o monkey-patch acima (cada worker carrega seu próprio módulo
// "node:module" do zero) — sem forçar processo único, o transform do
// nativewind sobre global.css volta a resolver o tailwindcss v4 errado
// dentro do worker e trava sem erro nenhum. Custo: build um pouco mais
// lento (sem paralelismo), aceitável pro tamanho deste app.
config.maxWorkers = 1;

module.exports = withNativeWind(config, { input: "./src/global.css" });
