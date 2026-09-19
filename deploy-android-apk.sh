#!/usr/bin/env bash
# Gera um .apk instalável direto no celular (sideload) via EAS Build —
# perfil "preview" do mobile/eas.json (buildType "apk", distribution
# "internal", não passa pela Play Store). Uso típico: testar no seu próprio
# aparelho (ex: Galaxy S20 FE) antes de publicar de verdade — veja
# deploy-android-play-store.sh para o fluxo de publicação na Play Store
# (que exige .aab, não .apk).
#
# Pré-requisitos:
#   - Conta Expo (https://expo.dev) — `eas login` na primeira vez.
#   - mobile/.env com EXPO_PUBLIC_API_URL apontando pra uma API alcançável
#     pelo celular (não localhost — veja mobile/.env.example).
#
# Uso:
#   ./deploy-android-apk.sh            # build na nuvem da Expo (EAS), sem precisar de Android SDK local
#   ./deploy-android-apk.sh --local    # build local (exige Android SDK + JDK instalados)

set -e
cd "$(dirname "$0")/mobile"

if ! command -v bun >/dev/null 2>&1; then
	echo "Bun não encontrado. Instale em https://bun.sh antes de continuar." >&2
	exit 1
fi

echo "==> Instalando dependências (bun install)"
bun install

if [ ! -f .env ]; then
	echo "mobile/.env não encontrado. Copie mobile/.env.example para mobile/.env e configure EXPO_PUBLIC_API_URL antes de continuar." >&2
	exit 1
fi

echo "==> Verificando login na Expo (eas whoami)"
if ! bunx eas-cli@latest whoami >/dev/null 2>&1; then
	echo "Você não está logado na Expo. Rode 'bunx eas-cli@latest login' e tente de novo." >&2
	exit 1
fi

if [ "$1" = "--local" ]; then
	echo "==> Build LOCAL do APK (perfil preview) — exige Android SDK + JDK instalados"
	bunx eas-cli@latest build --platform android --profile preview --local
else
	echo "==> Build na nuvem do APK (perfil preview)"
	bunx eas-cli@latest build --platform android --profile preview
fi

echo ""
echo "Build concluído. Baixe o .apk pelo link impresso acima (ou em https://expo.dev,"
echo "aba Builds do seu projeto) e transfira pro Galaxy S20 FE (USB, e-mail, Drive, etc.)."
echo "No aparelho: Configurações > Segurança > permitir instalação de apps de fontes"
echo "desconhecidas (só para o app usado para transferir o arquivo), depois abra o .apk."
