---
name: open-source-guidelines-pre-push
description:
  Checklist a que todo agente de IA (e humano) deve seguir antes de dar push
  em dev/main neste repositório, agora que o projeto segue padrão open
  source (Conventional Commits, SemVer, LICENSE, CONTRIBUTING). Use sempre
  antes de `git push`, antes de abrir um Pull Request, ou antes de marcar
  uma tarefa como concluída. Triggers on "push this", "open a PR", "ready to
  merge", "pronto pra subir", "antes de dar push", "finalizar a tarefa".
license: MIT
metadata:
  author: aleexgvieira
  version: "1.0.0"
---

# Open source guidelines — antes do push

Este repositório é (ou está a caminho de ser) open source. Isso muda o que
"pronto" significa: além de funcionar, cada mudança precisa ser algo que um
contribuidor externo, lendo o histórico do zero, consiga entender e confiar.
Este checklist roda **antes de todo `git push`** em `dev` ou `main` — não só
no fim de tarefas grandes.

Este skill assume que você já segue
[`.agents/skills/git-branch-workflow/SKILL.md`](../git-branch-workflow/SKILL.md)
(branch `dev` única, nunca commit direto em `main`). O que segue é adicional
a isso, específico de manter o projeto saudável como open source.

## Checklist antes de `git push`

1. **Mensagem de commit segue Conventional Commits.** O hook
   `.husky/commit-msg` bloqueia automaticamente o commit se não seguir — mas
   não dependa só do hook: escreva a mensagem certa da primeira vez (ver
   `CONTRIBUTING.md` pra tipos válidos e exemplos). Se a mudança quebra
   compatibilidade, use `!` no tipo (`feat(api)!: ...`) ou um rodapé
   `BREAKING CHANGE: ...`.
2. **Nenhum segredo real em nenhum arquivo staged.** Antes de `git add`,
   rode `git diff --cached` (ou `git status` + revisão manual dos arquivos)
   e procure por: chaves de API, tokens, senhas, hashes bcrypt reais,
   connection strings com credenciais embutidas. Arquivos `.env.example`,
   `.env.test`, `.env.e2e` devem conter **só placeholders** (ex:
   `<gere-com-openssl-rand-hex-32>`), nunca um valor que já funcionou de
   verdade — isso já aconteceu neste repositório (`backend/.env.example`,
   `bot/.env.example` e `docs/deploy-railway.md` tinham `BETTER_AUTH_SECRET`,
   `ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` e
   `TELEGRAM_BOT_TOKEN` reais até serem limpos). Se achar um segredo real
   staged ou já commitado, pare e avise quem mantém o projeto — não tente
   reescrever histórico compartilhado sozinho (ver
   `git-branch-workflow/SKILL.md`, seção "What NOT to do"); a correção é
   rotacionar a credencial, não só apagar o texto.
3. **`.editorconfig` e Biome não foram violados.** `bun run format && bun run
   lint` (o hook `pre-commit` já roda isso) — indentação, charset e largura
   de linha consistentes fazem parte do que torna um projeto open source
   fácil de revisar.
4. **`LICENSE` e `CONTRIBUTING.md` continuam corretos** se a mudança afeta
   como o projeto é licenciado, contribuído ou versionado. Não edite
   `LICENSE` sem confirmação explícita — é uma mudança legal, não técnica.
5. **`CLAUDE.md`/`AGENTS.md` atualizados** se a mudança introduziu uma nova
   convenção, comando, dependência estrutural ou mudança de arquitetura (ver
   a seção "Documentação e changelog" do `CLAUDE.md` global). Nunca crie ou
   edite `changelog.md` — o `CLAUDE.md` deste projeto proíbe isso
   explicitamente.
6. **Testes e build passam localmente** — o que o hook `pre-push` roda:

   ```bash
   (cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
   (cd frontend && bunx --bun tsc --noEmit && bun run build)
   ```

   E os testes E2E (`cd frontend && bunx playwright test`) se a mudança
   tocou rotas, formulários ou fluxos que `frontend/e2e/` cobre.
7. **Dependências novas usam versão estável exata**, nunca `latest`/`next`/
   `canary`/tags `alpha`/`beta`/pre-release, e o lockfile foi gerado com
   `npx bun@1.3.14 install` (não o bun global) — ver seção "Dependências" do
   `CLAUDE.md` global e a nota sobre `bun.lock` no `CLAUDE.md` deste projeto.

## Antes de merge `dev` → `main`

Além do checklist acima (que já deve valer pra cada commit em `dev`):

8. **Considere se a mudança merece uma release.** Se o conjunto de commits
   que está indo pra `main` representa uma unidade de valor pro usuário
   final (feature nova, fix relevante, mudança de comportamento), crie uma
   tag `vX.Y.Z` (seguindo SemVer — ver `CONTRIBUTING.md`) e uma
   [GitHub Release](../../../../../releases) com o resumo das mudanças, depois do
   merge em `main` estar pushado. Nem todo merge precisa de release — mudanças
   puramente internas (`chore`, `refactor` sem efeito observável) geralmente
   não.
9. **Nunca force-push em `main`.** Se algo deu errado depois do merge, corrija
   com um novo commit (`revert:` ou `fix:`), não reescrevendo o que já foi
   pushado — mesma regra do `git-branch-workflow`, reforçada aqui porque um
   histórico reescrito em um repositório público quebra qualquer fork,
   clone ou PR de terceiros que já exista.
