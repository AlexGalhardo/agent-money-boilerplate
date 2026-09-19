# Deploy do app mobile (Android): APK avulso e Google Play

O app mobile (`mobile/`, Expo + React Native) usa a mesma API do frontend
web e do bot do Telegram — nenhum backend próprio. Build e publicação são
feitos via [EAS Build](https://docs.expo.dev/build/introduction/) (serviço
de build na nuvem da Expo), configurado em `mobile/eas.json` com 3 perfis:
`development`, `preview` (gera `.apk`) e `production` (gera `.aab`, exigido
pela Play Store).

## Pré-requisitos

- [Bun](https://bun.sh) >= 1.4
- Conta na [Expo](https://expo.dev) (grátis) — `bunx eas-cli@latest login` dentro
  de `mobile/` na primeira vez.
- `mobile/.env` configurado (copie de `mobile/.env.example`) com
  `EXPO_PUBLIC_API_URL` apontando pra uma API **alcançável pelo
  celular/pela nuvem da Expo** — nunca `localhost`.

## Gerar um `.apk` pra instalar direto no celular (sideload)

Uso mais comum: testar o app no seu próprio aparelho (ex: Galaxy S20 FE)
sem passar pela Play Store.

```bash
./deploy-android-apk.sh
```

O script builda na nuvem da Expo (perfil `preview` — `buildType: "apk"`,
`distribution: "internal"`) e imprime um link de download ao final (também
disponível em https://expo.dev, aba **Builds** do projeto). Baixe o `.apk`
pelo link, transfira pro celular (cabo USB, e-mail, Google Drive, etc.) e
abra o arquivo — o Android vai pedir permissão pra instalar de "fontes
desconhecidas" na primeira vez (**Configurações > Segurança**, ou o próprio
diálogo de instalação já oferece o atalho).

Pra buildar localmente em vez de usar a nuvem da Expo (exige Android SDK +
JDK instalados):

```bash
./deploy-android-apk.sh --local
```

## Publicar na Google Play (deploy "profissional")

Passos únicos, feitos manualmente antes do primeiro deploy:

1. Crie uma [conta de desenvolvedor Google Play](https://play.google.com/console)
   (taxa única de USD 25).
2. Crie o app no Play Console: nome, ficha na loja (descrição, screenshots,
   ícone), categoria, e **publique uma política de privacidade** (a Play
   Store recusa qualquer build sem isso).
3. No Play Console, vá em **Configurações > Acesso à API**, conecte um
   projeto do Google Cloud e crie uma **Service Account** com papel de
   "Release manager". Baixe a chave JSON dela e salve em
   `mobile/google-play-service-account.json` — **nunca commite esse
   arquivo** (já está no `.gitignore` da raiz).
4. Rode `bunx eas-cli@latest login` dentro de `mobile/` se ainda não tiver feito.

Depois disso, o deploy em si:

```bash
./deploy-android-play-store.sh            # builda o .aab de produção
./deploy-android-play-store.sh --submit   # builda e já envia pra faixa "internal testing"
```

O perfil `production` do `mobile/eas.json` builda um `.aab` (formato
exigido pela Play Store, diferente do `.apk` do sideload) com
`autoIncrement` ligado — o `versionCode` sobe sozinho a cada build,
dispensando editar `mobile/app.json` manualmente antes de cada release.
`--submit` usa a Service Account configurada acima pra subir o `.aab` na
faixa **internal testing** via
[EAS Submit](https://docs.expo.dev/submit/android/); promover pra produção
(ou pra outras faixas — closed/open testing) é manual, dentro do Play
Console.

Sem `--submit`, o script só builda e imprime o link de download — suba o
`.aab` manualmente em https://play.google.com/console quando preferir.

## Identidade do app

`mobile/app.json` define o `scheme` (`money://`, usado pro deep link de
login com Google e de redefinição de senha — ver CLAUDE.md), o
`android.package` (`com.elysiagalhardofinances.money`) e o
`ios.bundleIdentifier` correspondente. Mudar qualquer um dos dois depois do
primeiro build/publicação quebra a identidade do app nas lojas — trate como
definitivo.
