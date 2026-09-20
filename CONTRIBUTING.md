# Contribuindo com o Elysia Finanças

Obrigado pelo interesse em contribuir. Este documento resume o fluxo esperado
de qualquer mudança neste repositório — humano ou agente de IA.

## Antes de começar

1. Leia o [`CLAUDE.md`](./CLAUDE.md) — ele descreve a arquitetura do
   monorepo, a stack e as convenções de código que este projeto segue à risca.
2. Rode um dos scripts de setup (`./setup-unix-using-docker.sh`,
   `./setup-unix-using-pm2.sh`, `./setup-windows-using-docker.sh` ou
   `./setup-windows-using-pm2.sh`) para levantar o ambiente localmente. Cada
   um está documentado em `docs/`.
3. Abra uma [issue](../../issues) antes de começar qualquer mudança grande
   (nova feature, refatoração de arquitetura) para alinhar a abordagem antes
   de investir tempo escrevendo código. Bugs pequenos e typos podem ir direto
   pra um Pull Request.

## Fluxo de branches

Este repositório segue um fluxo estrito de duas branches — `main` (única
branch de longa duração) e `dev` (branch de trabalho descartável por tarefa).
As regras completas, e o porquê de cada uma, estão em
[`.agents/skills/git-branch-workflow/SKILL.md`](./.agents/skills/git-branch-workflow/SKILL.md).
Resumo:

1. Crie sua branch a partir de `main` atualizada.
2. Faça suas mudanças e commits nela.
3. Rode localmente o que o hook `pre-push` roda (veja "Antes de abrir PR"
   abaixo) — só abra o PR se passar tudo.
4. Abra um Pull Request contra `main`. Nunca commite direto em `main`, nunca
   force-push em `main`.

## Mensagens de commit — Conventional Commits

Toda mensagem de commit **é validada automaticamente** pelo hook
`.husky/commit-msg` e precisa seguir
[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<tipo>(<escopo opcional>): <descrição>

[corpo opcional]

[rodapé opcional, ex: BREAKING CHANGE: ...]
```

Tipos aceitos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert` — mais `merge`, usado só para o commit de
merge de `dev` em `main` (ex: `merge: fix de autenticação (dev -> main)`).

Exemplos:

```text
feat(transactions): adiciona exportação de relatório em PDF
fix(e2e): corrige proxy do vite dev em modo e2e
docs(deploy): documenta variáveis de ambiente do Railway
refactor(bot): extrai verify-password-step para módulo próprio
```

Uma mudança que quebra compatibilidade (ver seção de versionamento abaixo)
deve incluir `BREAKING CHANGE: <explicação>` no rodapé do commit, ou um `!`
depois do tipo/escopo (`feat(api)!: remove endpoint legado`).

## Versionamento — Semantic Versioning

Este projeto segue [SemVer 2.0.0](https://semver.org/lang/pt-BR/)
(`MAJOR.MINOR.PATCH`):

- **MAJOR** — mudança incompatível (breaking change) na API, no schema do
  banco de forma não-migrável automaticamente, ou em contratos entre
  `backend`/`frontend`/`bot`/`mobile`.
- **MINOR** — nova funcionalidade compatível com versões anteriores.
- **PATCH** — correção de bug compatível com versões anteriores.

Enquanto a versão for `0.MINOR.PATCH` (como é hoje — ver `package.json` na
raiz), a API pública é considerada instável e mudanças incompatíveis podem
acontecer em releases `MINOR`, como o próprio SemVer permite para a série
`0.x`. O projeto sobe para `1.0.0` quando a API entre os quatro workspaces
(rotas do backend consumidas por frontend/bot/mobile via Eden) for
considerada estável o suficiente para garantir compatibilidade entre
releases `MINOR`.

Cada release relevante (tipicamente ao fechar um conjunto de mudanças em
`main`) ganha uma tag `vX.Y.Z` e uma
[GitHub Release](../../releases) correspondente, com as mudanças resumidas.

## Código

Siga as convenções já documentadas no [`CLAUDE.md`](./CLAUDE.md):
Biome (tabs, largura de linha 120), módulos por domínio no backend
(`*.routes.ts` → `*.service.ts` → `*.repository.ts`), testes ao lado do
arquivo testado, e os quatro pontos de sincronia manual entre workspaces
(categorias de transação, mapas de erro do better-auth, regras de senha,
`.editorconfig` na raiz para indentação/charset consistentes entre editores).

## Antes de abrir o Pull Request

Rode o que o hook `pre-push` roda:

```bash
(cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

E, se sua mudança tocou `frontend/e2e/`, `frontend/playwright.config.ts` ou
rotas que o E2E cobre, rode também os testes end-to-end:

```bash
cd frontend && bunx playwright test
```

Um PR só é considerado pronto pra revisão com todos os itens acima passando
— o hook `pre-push` (e o CI, em `.github/workflows/ci.yml`) bloqueiam o
contrário.

## Relatando bugs e propondo features

Use as [issues](../../issues) do GitHub. Para bugs, inclua passos pra
reproduzir, comportamento esperado vs. observado, e (quando fizer sentido)
qual workspace é afetado (`backend`, `frontend`, `bot`, `mobile`). Para
features, descreva o problema que a feature resolve antes da solução
proposta — ajuda a discutir alternativas antes de qualquer código.

## Segredos e variáveis de ambiente

Nunca commite um arquivo `.env` real (só `.env.example`/`.env.test`, sempre
com valores de placeholder, nunca chaves reais). Se você suspeitar que um
segredo real vazou em algum commit, avise imediatamente em vez de tentar
corrigir sozinho reescrevendo histórico — histórico compartilhado
(`main`/`dev` já pusheadas) só é reescrito de forma deliberada e combinada
com quem mantém o projeto.
