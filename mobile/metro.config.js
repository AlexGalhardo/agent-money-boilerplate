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

// nativewind gera o CSS chamando a CLI real do Tailwind v3 num PROCESSO
// FILHO separado (child_process.fork, ver
// node_modules/nativewind/dist/metro/tailwind/v3/index.js) — um processo
// novo não herda o monkey-patch acima (módulo "node:module" carregado do
// zero de novo), então QUALQUER `require("tailwindcss/...")` desse filho —
// e o código interno do Tailwind v3 se auto-referencia assim em vários
// pontos, não só no entrypoint da CLI — volta a resolver a v4 hoisted na
// raiz, que não tem mais os caminhos internos que a v3 exige
// (ERR_PACKAGE_PATH_NOT_EXPORTED). O bug real do nativewind (corrigido via
// `bun patch nativewind`, ver patches/nativewind.patch) é nunca tratar
// esse crash: sem handler de "exit"/"error" no processo filho, a Promise
// de getCSSForPlatform nunca resolve nem rejeita — Metro trava esperando o
// CSS pra sempre, e como isso acontece bem no início da árvore de
// dependências (global.css é importado logo de cara), o build inteiro
// nunca produz saída nenhuma (reproduzido tanto localmente quanto no build
// "preview" da EAS: "Starting Metro Bundler" seguido de silêncio total).
// O mesmo patch também reinstala esse monkey-patch de resolução DENTRO do
// processo filho (ver child.js) — a env var abaixo é o que esse patch lê
// pra saber qual é a raiz local correta.
process.env.NATIVEWIND_TAILWIND_LOCAL_ROOT = localTailwind;

const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(projectRoot);

// Metro por padrão transforma arquivos em worker_threads separados, que NÃO
// herdam o monkey-patch acima (cada worker carrega seu próprio módulo
// "node:module" do zero) — sem forçar processo único, o transform do
// nativewind sobre global.css volta a resolver o tailwindcss v4 errado
// dentro do worker e trava sem erro nenhum. Custo: build um pouco mais
// lento (sem paralelismo), aceitável pro tamanho deste app.
config.maxWorkers = 1;

const nativeWindConfig = withNativeWind(config, { input: "./src/global.css" });

// Medida de segurança adicional (não é a causa do bug corrigido acima): o
// Expo SDK 57 embrulha qualquer `transformerPath` customizado (o do
// nativewind, nesse caso) num "transform worker supervisor" (@expo/cli
// withMetroSupervisingTransformWorker) que roda o transformer dentro de um
// worker isolado — que também não herdaria o monkey-patch acima, pelo
// mesmo motivo do processo filho do Tailwind CLI. Desliga a supervisão e
// roda o transformer customizado no processo principal (onde o patch já
// existe), fechando essa outra via de resolução incorreta antes que vire
// um segundo bug do mesmo tipo.
nativeWindConfig.transformer.expo_customTransformerPath = false;

module.exports = nativeWindConfig;
