# Plano — Bot do Telegram para controle financeiro pessoal

Status: aprovado para implementação (decisões de arquitetura confirmadas com o
dono do projeto em 2026-09-14, ver seção "Decisões confirmadas").

> **Histórico — superado pela Fase 9.** Este documento registra as decisões
> da implementação *original* do bot (Telegraf, allowlist de chat único,
> usuário fixo `aleexgvieira@gmail.com`). Na Fase 9 da refatoração o bot
> migrou para [grammY](https://grammy.dev), virou multi-tenant (qualquer
> chat pode se vincular à própria conta) e passou a exigir plano ativo (com
> fluxo de pagamento PIX pelo próprio chat). Mantido aqui como registro
> histórico das decisões originais — **o guia atual de uso/setup é
> `docs/telegram-bot.md`**.

## 1. Objetivo

Um bot do Telegram de uso exclusivo do dono do projeto (Alex Galhardo Vieira,
`@galhardoalex`, chat id `1477312913`), rodando localmente, que permite
controlar as mesmas finanças do dashboard web (Elysia Finanças) inteiramente
por conversa no Telegram: adicionar receitas/despesas, listar, buscar/filtrar
e apagar transações — sem precisar abrir o navegador.

## 2. Decisões confirmadas com o usuário

| Decisão | Escolha |
|---|---|
| Frequência da senha pessoal | Pedida em **toda** operação que finaliza algo (adicionar receita/despesa, listar, buscar, apagar) — nunca destrava a sessão por tempo. |
| Dados | Bot usa o **mesmo banco e o mesmo usuário** do dashboard web (`aleexgvieira@gmail.com`) — uma transação criada pelo bot aparece no dashboard e vice-versa. |
| Estilo de interação | Comandos (`/despesa`, `/receita`, `/buscar`, ...) que iniciam um **fluxo guiado em texto** (pergunta → resposta), com botões inline só para escolhas curtas (categoria, confirmar, cancelar). |
| Tentativas de senha erradas | **Bloqueio temporário** após N tentativas erradas seguidas (cooldown), além do allowlist de chat id. |

## 3. Modelo de segurança (três camadas)

1. **Allowlist de chat id.** Todo update do Telegram passa por um middleware
   que compara `ctx.chat.id` com `TELEGRAM_ALLOWED_CHAT_ID` (env var, valor
   `1477312913`). Qualquer chat diferente é ignorado silenciosamente (sem
   resposta) — o bot nunca confirma para um estranho que está "vivo" ou que
   aceita comandos.
2. **Senha pessoal por operação.** Nenhum dado é lido/escrito sem antes validar
   a senha pessoal naquela mesma interação. A senha nunca é guardada em texto
   plano: um hash bcrypt (`BOT_PASSWORD_HASH` em `bot/.env`) é gerado uma vez
   (script `bun run scripts/hash-password.ts "senha"`) e comparado com
   `bcrypt.compare` a cada tentativa. A senha em si (`galhardyn`) nunca aparece
   no código-fonte nem em nenhum arquivo versionado.
3. **Lockout por tentativas erradas.** Um contador em memória
   (`bot/src/lib/lockout.ts`) por chat id: `BOT_MAX_ATTEMPTS` (padrão 5) senhas
   erradas seguidas bloqueiam novas tentativas por `BOT_LOCKOUT_MINUTES`
   (padrão 15). O contador zera em qualquer senha correta. Estado em memória é
   aceitável aqui (processo único, uso pessoal) — reinicia ao reiniciar o bot.

O token do bot (`TELEGRAM_BOT_TOKEN`) e o hash da senha vivem só em
`bot/.env` (gitignorado, nunca commitado) — `bot/.env.example` traz os nomes
das variáveis vazios.

> Nota de segurança: o token do bot foi compartilhado em texto puro nesta
> conversa. Ele vai para `bot/.env` local (não versionado), mas como já
> apareceu no histórico do chat, considere regenerá-lo pelo @BotFather
> (`/revoke`) depois que tudo estiver funcionando, por precaução.

## 4. Arquitetura

Novo workspace Bun `bot/` na raiz do monorepo (adicionado a
`workspaces` no `package.json` raiz), com dependência de workspace em
`@elysia-galhardo-finances/api` para **reaproveitar diretamente**, sem
duplicar nem chamar por HTTP:

- `prisma` (client) e os dois models (`User`, `Transaction`) — mesmo banco
  configurado em `api/.env` (`DATABASE_URL`/`DATABASE_PROVIDER`).
- `encrypt`/`decrypt` (`api/src/lib/encryption.ts`) — mesmo `ENCRYPTION_KEY`.
- `transactionService` e `categorizeDescription` (do módulo de import) para
  criar/listar/estatísticas sem reimplementar regra de negócio.
- `transactionCategories`/`transactionTypes` (enum compartilhado).

Isso significa que `bot/.env` precisa apontar para o **mesmo**
`DATABASE_URL`/`DATABASE_PROVIDER`/`ENCRYPTION_KEY` que `api/.env` (copiados
na configuração inicial). Não existe API HTTP entre o bot e os dados — é
Bun + Prisma direto, como um segundo "consumidor" do mesmo banco, do mesmo
jeito que a API e um script de seed já são dois consumidores hoje.

O bot resolve o `userId` uma vez na inicialização, buscando
`prisma.user.findUniqueOrThrow({ where: { email: "aleexgvieira@gmail.com" } })`
— não há multi-tenant no bot, é sempre esse usuário.

### Biblioteca

[Telegraf](https://telegraf.js.org) — a biblioteca mais usada do ecossistema
TypeScript/Node para bots do Telegram (a mesma classe de popularidade de
`express` para APIs REST). Usa `telegraf/scenes` + `telegraf/session` para os
fluxos guiados (wizards) com estado por conversa.

### Estrutura de diretórios

```
bot/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
├── .env.test
├── src/
│   ├── bot.ts                    # monta o Telegraf, registra middlewares/scenes, bootstrap
│   ├── index.ts                  # entrypoint (bot.launch())
│   ├── config/
│   │   └── env.ts                # zod schema das env vars do bot (mesmo padrão da api)
│   ├── lib/
│   │   ├── auth-middleware.ts    # allowlist de chat id
│   │   ├── password.ts           # hash/verify (bcrypt) + wrapper "requirePassword"
│   │   ├── lockout.ts            # contador de tentativas erradas em memória
│   │   └── current-user.ts       # resolve o userId fixo (aleexgvieira@gmail.com)
│   ├── formatting/
│   │   └── format.ts             # formata valores (centavos → R$), datas, listas de transação
│   ├── date-ranges/
│   │   └── date-ranges.ts        # calcula {from,to} para "última semana", "últimos 30 dias", mês, ano
│   └── scenes/
│       ├── add-transaction.scene.ts   # /despesa e /receita (compartilham o wizard, tipo fixo por comando)
│       ├── list-transactions.scene.ts # /transacoes
│       ├── search.scene.ts            # /buscar (menu de filtro → pergunta → resultado)
│       ├── delete-transaction.scene.ts# /apagar
│       └── balance.scene.ts           # /resumo
├── src/**/*.unit.test.ts          # testes das partes puras (sem rede)
└── scripts/
    └── hash-password.ts           # gera BOT_PASSWORD_HASH a partir de uma senha em texto (uso único, manual)
```

## 5. Comandos e fluxos

Todo comando que acessa dados do usuário começa pedindo a senha (step 1 do
scene); comandos informativos (`/start`, `/ajuda`, `/categorias`) não pedem.

| Comando | Pede senha? | Fluxo |
|---|---|---|
| `/start` | Não | Mensagem de boas-vindas + lista de comandos disponíveis. |
| `/ajuda` | Não | Texto de ajuda com exemplos de cada comando. |
| `/categorias` | Não | Lista as categorias válidas (enum fixo, mesmo do dashboard). |
| `/despesa` | Sim | Wizard: senha → valor (R$) → categoria (botões inline) → descrição (texto livre) → confirmar (botões Sim/Cancelar) → salva `type: "expense"`. |
| `/receita` | Sim | Mesmo wizard de `/despesa`, com `type: "income"`. |
| `/transacoes` | Sim | Wizard: senha → lista as últimas 10 transações (mais recentes primeiro), com botão "Ver mais" para paginar. |
| `/resumo` | Sim | Wizard: senha → mostra total de receitas, despesas e saldo do mês atual, e por categoria (reaproveita `statsByCategory`). |
| `/buscar` | Sim | Wizard: senha → menu de filtro (botões: Categoria / Nome / Período personalizado / Ano / Mês / Última semana / Últimos 30 dias) → pergunta específica do filtro escolhido → mostra resultados paginados. |
| `/apagar` | Sim | Wizard: senha → pede o texto para localizar a transação (busca por nome, mostra candidatos com botões) → confirmação explícita ("Tem certeza?") → apaga. |
| `/cancelar` | — | Sai de qualquer scene/wizard em andamento a qualquer momento. |

### Detalhe do `/buscar` (item 3.2 do pedido)

O menu de filtro cobre exatamente os critérios pedidos:

- **Categoria** — botões inline com as categorias existentes.
- **Nome da transação** — busca por texto na descrição (case-insensitive, como
  o dashboard web).
- **Data inicial e final** — usuário digita duas datas `dd/mm/aaaa`.
- **Ano** — usuário digita `aaaa`, filtra o ano inteiro.
- **Mês** — usuário digita `mm/aaaa`, filtra o mês inteiro.
- **Última semana** — calculado automaticamente (`hoje - 7 dias` até hoje).
- **Últimos 30 dias** — calculado automaticamente (`hoje - 30 dias` até hoje).

Todos os cálculos de intervalo de data ficam isolados em
`bot/src/date-ranges/date-ranges.ts`, puros e testáveis sem Telegraf.

## 6. Testes

Sem chamadas de rede reais ao Telegram nos testes. Separação clara entre
"lógica pura" (testável direto) e "handlers finos" (só conectam Telegraf ao
resto):

- `password.unit.test.ts` — hash/verify, formato do hash.
- `lockout.unit.test.ts` — contagem de tentativas, bloqueio após N erros,
  reset em acerto, expiração do cooldown (com tempo mockado).
- `date-ranges.unit.test.ts` — cada tipo de intervalo (semana, 30 dias, mês,
  ano, personalizado), incluindo casos de borda (troca de ano, mês de 31 dias).
- `format.unit.test.ts` — formatação de moeda e de listas de transação.
- Testes de integração leves das scenes usando `telegraf-test` ou mocks
  manuais de `Context` (sem subir servidor, sem token real) para validar que
  o fluxo completo (senha certa/errada, valor inválido, categoria inexistente)
  produz a transação esperada no banco de teste (`bot/.env.test`, banco sqlite
  isolado como `api/.env.test`).

## 7. Infraestrutura

- **`bot/package.json`**: scripts `dev` (`bun run --watch src/index.ts`),
  `start`, `test`, `test:unit`, `hash-password`.
- **`bot/Dockerfile`**: mesmo padrão multi-stage do `api/Dockerfile` (Bun
  alpine, usuário não-root), sem porta exposta (bot não escuta HTTP, só faz
  polling ao Telegram).
- **`docker-compose.sqlite.yml`** e **`docker-compose.yml`**: novo serviço
  `bot`, com `env_file: ./bot/.env`, dependendo de `api` (só para garantir que
  as migrations já rodaram) e montando o mesmo volume `sqlite_data` (para
  enxergar o mesmo `dev.db`) no caso do compose SQLite.
- **`setup.sh`**: passo opcional que copia `bot/.env.example` → `bot/.env`,
  copia `DATABASE_URL`/`DATABASE_PROVIDER`/`ENCRYPTION_KEY` do `api/.env` já
  gerado, e imprime um lembrete para preencher manualmente
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID` e rodar o script de hash da
  senha (o token e a senha não são gerados automaticamente, são fornecidos
  pelo usuário).
- **`bun run bot:dev`** no `package.json` raiz, ao lado de `api:dev`/`frontend:dev`.

## 8. Documentação (`docs/`)

Novo arquivo **`docs/telegram-bot.md`**:

- O que o bot faz, para quem (uso pessoal, single-user).
- Como criar/obter o token no @BotFather (referência, já que o usuário já tem
  o token e o chat id neste caso).
- Passo a passo de setup local (env vars, gerar o hash da senha, rodar
  `bun run bot:dev`).
- Lista de comandos com exemplos de conversa (input/output).
- Modelo de segurança (as três camadas da seção 3), para o usuário entender o
  que está e o que não está protegido.
- Como rodar os testes do bot.
- Como rodar via Docker Compose.

`README.md` ganha uma linha na tabela de stack (Telegraf) e um link para
`docs/telegram-bot.md`.

## 9. Ordem de implementação

1. Workspace `bot/` (`package.json`, `tsconfig.json`, dependências: `telegraf`,
   `bcryptjs`, `zod`, dependência de workspace em `@elysia-galhardo-finances/api`).
2. `config/env.ts` + `.env.example` + `.env.test`.
3. `lib/password.ts`, `lib/lockout.ts` + testes unitários.
4. `date-ranges/date-ranges.ts` + testes unitários.
5. `formatting/format.ts` + testes unitários.
6. `lib/auth-middleware.ts` (allowlist) + `lib/current-user.ts`.
7. Scenes: `add-transaction`, `list-transactions`, `balance`, `search`,
   `delete-transaction`.
8. `bot.ts` / `index.ts` — monta tudo, comandos `/start`, `/ajuda`,
   `/categorias`, `/cancelar`.
9. `scripts/hash-password.ts`.
10. Testes de integração das scenes (mock de `Context`).
11. Docker (`Dockerfile`, entradas em `docker-compose*.yml`).
12. `setup.sh` + script `bot:dev` no `package.json` raiz.
13. `docs/telegram-bot.md` + atualização do `README.md`.
14. Rodar `bun run typecheck`, lint e testes de tudo; testar manualmente
    conversando com o bot real (token fornecido) apontando para o banco local
    já populado.

## 10. Fora de escopo (por ora)

- Webhook em produção (HTTPS público) — só long-polling, adequado para uso
  local pessoal. Documentar como possível evolução futura, sem implementar.
- Multi-usuário / múltiplos chats autorizados.
- Edição de transação existente pelo bot (só criar, listar, buscar, apagar —
  não foi pedido "editar").
- Anexar/gerar relatórios em PDF/imagem — fora do que foi pedido.
