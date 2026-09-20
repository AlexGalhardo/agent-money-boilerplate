#!/usr/bin/env bash
# Deploy "profissional" na Google Play: gera o .aab (Android App Bundle —
# formato exigido pela Play Store, diferente do .apk usado pra sideload em
# deploy-android-apk.sh) via EAS Build e, opcionalmente, já submete pra
# faixa "internal testing" via EAS Submit.
#
# Pré-requisitos (só precisam ser feitos uma vez, manualmente):
#   1. Conta Expo (https://expo.dev) — `eas login`.
#   2. Conta de desenvolvedor Google Play (taxa única de USD 25,
#      https://play.google.com/console) com o app já criado lá (nome,
#      ficha na loja, política de privacidade — a Play Store exige uma
#      URL publicada antes de aceitar qualquer build).
#   3. Uma Service Account do Google Cloud com permissão de "Release
#      manager" vinculada ao Play Console (Configurações > Acesso à API),
#      com a chave JSON salva em mobile/google-play-service-account.json
#      (arquivo sensível — NUNCA commitar; já coberto pelo .gitignore).
#   4. mobile/.env com EXPO_PUBLIC_API_URL apontando pra API de produção.
#
# Uso:
#   ./deploy-android-play-store.sh              # só builda o .aab
#   ./deploy-android-play-store.sh --submit      # builda e já submete (faixa "internal", ver mobile/eas.json)

set -e
cd "$(dirname "$0")/mobile"

if ! command -v bun >/dev/null 2>&1; then
	echo "Bun não encontrado. Instale em https://bun.sh antes de continuar." >&2
	exit 1
fi

echo "==> Instalando dependências (bun install)"
bun install

if [ ! -f .env ]; then
	echo "mobile/.env não encontrado. Copie mobile/.env.example para mobile/.env e configure EXPO_PUBLIC_API_URL (apontando para a API de produção) antes de continuar." >&2
	exit 1
fi

# Versão fixa (não "@latest") — ver deploy-android-apk.sh para o motivo.
echo "==> Verificando login na Expo (eas whoami)"
if ! bunx eas-cli@24.7.0 whoami >/dev/null 2>&1; then
	echo "Você não está logado na Expo. Rode 'bunx eas-cli@24.7.0 login' e tente de novo." >&2
	exit 1
fi

echo "==> Build de produção do .aab (perfil production, autoIncrement de versionCode ligado)"
bunx eas-cli@24.7.0 build --platform android --profile production --non-interactive

if [ "$1" = "--submit" ]; then
	if [ ! -f google-play-service-account.json ]; then
		echo "mobile/google-play-service-account.json não encontrado — não dá pra submeter automaticamente." >&2
		echo "Baixe a chave da Service Account no Google Cloud Console (ver comentário no topo deste script) e salve nesse caminho, ou suba o .aab manualmente em https://play.google.com/console." >&2
		exit 1
	fi
	echo "==> Submetendo o build mais recente pra faixa 'internal' da Play Store"
	bunx eas-cli@24.7.0 submit --platform android --profile production --latest
	echo ""
	echo "Enviado. Acompanhe o processamento em https://play.google.com/console — a faixa"
	echo "'internal testing' costuma liberar em minutos; promover pra produção é manual."
else
	echo ""
	echo "Build do .aab concluído (link acima, ou em https://expo.dev). Pra publicar:"
	echo "  ./deploy-android-play-store.sh --submit"
	echo "ou suba o .aab manualmente em https://play.google.com/console."
fi
