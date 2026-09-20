# Reescrita visual do mobile com reacticx

Data: 2026-09-20
Branch de trabalho: `dev`

## Objetivo

Trocar a camada visual das 11 telas do app mobile (`mobile/src/app/**`) e do
kit de UI compartilhado (`mobile/src/components/ui/`) para usar componentes
da biblioteca [reacticx](https://www.reacticx.com) — um registro de
componentes React Native animados (Reanimated/Skia/Gesture Handler),
distribuído no estilo shadcn: o CLI copia o código-fonte de cada componente
para dentro do projeto (não é uma dependência de npm importada normalmente).

**Fora de escopo**: qualquer mudança de lógica de negócio, fluxos de
autenticação, chamadas à API, validação de formulário ou navegação. Esta é
uma reescrita puramente visual/de interação — todas as telas continuam se
comportando exatamente como hoje.

## Estado atual

- Stack: Expo Router + NativeWind (Tailwind v3) + React Native puro.
- 11 telas: `login`, `signup`, `forgot-password`, `reset-password`,
  `two-factor` (grupo `(auth)`); `dashboard`, `profile`, `subscription`,
  `import-nubank`, `transaction/[id]` (grupo `(app)`); mais os dois
  `_layout.tsx` (raiz e por grupo).
- Kit de UI compartilhado (6 arquivos): `button.tsx`, `text-field.tsx`,
  `chip.tsx`, `date-field.tsx`, `google-button.tsx`,
  `category-pie-chart.tsx`.
- Deps nativas já presentes que o reacticx também usa:
  `react-native-reanimated@4.5.1`, `react-native-gesture-handler@~2.32.0`,
  `react-native-svg@15.15.4`. Não há `@shopify/react-native-skia` instalado
  ainda — pode ser necessário para componentes que usem Skia.
- Histórico relevante (`CLAUDE.md`): builds Android da EAS já quebraram por
  causa de patches de dependência nativa (nativewind) — qualquer bump de
  dependência nativa precisa ser validado com um build real antes de dar
  como concluído.

## Abordagem escolhida

Híbrida: mantém `components/ui/` como a costura estável entre telas e
implementação visual (mesma API de props — nenhuma tela muda como chama
esses componentes), mas troca o miolo desses 6 arquivos para usar
componentes reacticx vendorizados. Além disso, cada tela recebe animação de
nível de página (entrada com fade/slide, transição de lista, feedback de
toque) usando primitivas reacticx, sempre em cima de interações que já
existem hoje — nenhuma interação nova (gesto, swipe, etc.) é introduzida,
só o tratamento visual de interações que já existiam.

Motivo de não usar as outras duas abordagens consideradas:
- Só trocar o miolo do kit sem tocar nas telas deixaria o reacticx "escondido"
  — não cumpriria o pedido de "refazer as telas".
- Reescrever cada tela diretamente com primitivas reacticx (abandonando o
  kit) tocaria muito mais superfície por tela, aumentando o risco de alterar
  lógica sem querer e contrariando a decisão de "só troca visual".

## Mapeamento de componentes

| Arquivo atual | Vira |
|---|---|
| `button.tsx` | wrapper fino sobre o `Button` reacticx (feedback de toque animado) |
| `text-field.tsx` | wrapper sobre o input reacticx |
| `chip.tsx` | wrapper sobre chip/badge reacticx |
| `google-button.tsx` | variante do `Button` reacticx + ícone Google |
| `date-field.tsx` | reacticx se houver date-picker no catálogo; senão mantém `@react-native-community/datetimepicker` atual, só trocando o trigger visual/animação — registrado como exceção deliberada se for o caso |
| `category-pie-chart.tsx` | componente da categoria "Charts" do catálogo reacticx |

Os nomes exatos de componentes no catálogo reacticx não estão documentados
publicamente em detalhe — são resolvidos durante a implementação via
`npx reacticx list` / `npx reacticx info <nome>`.

## Tooling

- Instalar o CLI via `npx reacticx init` (gera `component.config.json` a
  partir do `tsconfig.json`/lockfile do workspace `mobile`).
- Instalar a skill do Claude Code no projeto:
  `npx degit rit3zh/reacticx/skills/using-reacticx .claude/skills/using-reacticx`.
- Não instalar o MCP server (`@reacticx/mcp`) — decisão explícita do
  usuário, CLI + skill bastam.
- Componentes são adicionados sob demanda com `npx reacticx add <nome>`
  conforme cada arquivo do kit for migrado.

## Sequenciamento e commits

Todo o trabalho acontece localmente na branch `dev`, com **um commit por
componente do kit e por tela**, sem push intermediário:

1. Commit de setup: `npx reacticx init` + skill instalada + bump de deps
   nativas compartilhadas que forem necessárias (ex.: versão do Reanimated
   exigida pelos componentes, adição de `@shopify/react-native-skia` se
   algum componente escolhido precisar).
2. Um commit por componente do kit (6 commits: button, text-field, chip,
   google-button, date-field, category-pie-chart).
3. Um commit por tela (11 commits). Cada `_layout.tsx` de grupo
   (`(auth)`/`(app)`) é incluído no commit da primeira tela daquele grupo
   que precisar de um provider novo do reacticx, se houver.
4. Commit final de ajustes descobertos durante a validação do build (passo
   seguinte).

**Build e push só no final**: nenhum build EAS é rodado até que todas as
telas e todo o kit estejam migrados. Só depois disso:

1. Rodar `bunx eas-cli@24.7.0 build --platform android --profile preview`
   (mesmo perfil usado em `deploy-android-apk.sh`).
2. Só se o build passar: `git push -u origin dev` (se ainda não estiver
   sincronizada) e então seguir o fluxo padrão de merge (`dev` → `main`,
   push de `main`) descrito no `CLAUDE.md` da raiz.
3. Se o build falhar, corrigir e repetir o build antes de qualquer push ou
   merge — não faz push de `dev` nem merge em `main` com o build quebrado.

## Validação incremental (sem build)

Depois do kit e depois de cada tela: `bun run typecheck:mobile` (raiz do
monorepo) para garantir que não há regressão de tipos. `bun run lint`
(Biome) também roda incrementalmente. Testes Jest existentes em `mobile/`
(se algum tocar nos arquivos migrados) rodam junto.

## Documentação

Ao final da reescrita, atualizar `CLAUDE.md` (raiz e/ou `mobile/` se
existir um específico) registrando: a nova dependência estrutural
(reacticx + skill instalada), qualquer bump de dependência nativa feito, e
qualquer exceção documentada (ex.: `date-field.tsx` não migrado se não
houver componente equivalente). Não criar `changelog.md` — proibido pelo
`CLAUDE.md` do projeto.

## Riscos e mitigação

- **Bump de dependência nativa quebrar o build Android** (já aconteceu
  antes com nativewind) — mitigado por só fazer push/merge depois do build
  EAS passar de verdade.
- **Componente reacticx sem equivalente direto** (ex.: date picker) —
  mitigado mantendo o componente atual como exceção documentada, sem
  bloquear o resto da migração.
- **Progresso perdido se o build falhar tarde** — mitigado por commits
  incrementais locais em `dev` a cada componente/tela, permitindo reverter
  só o commit problemático sem perder o resto.
