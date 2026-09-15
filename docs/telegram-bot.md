# Bot do Telegram

Bot multi-tenant (Fase 9 da refatoração) para controlar as mesmas finanças do
dashboard web pelo Telegram: adicionar receitas e despesas, listar,
buscar/filtrar, apagar transações, gerar relatório em PDF e assinar um plano
via PIX — tudo pelo chat.

Ver a arquitetura completa e as decisões de design em
[`telegram-bot-plan.md`](./telegram-bot-plan.md) — este documento aqui é o
guia prático de setup e uso.

## Como funciona

O bot roda como um terceiro "consumidor" do mesmo banco de dados da API
(`api/`), reaproveitando diretamente o Prisma Client, a criptografia
(AES-256-GCM), o `paymentService`/cliente AbacatePay e as regras de negócio
de transações já existentes — não existe uma cópia separada dos dados nem
uma chamada HTTP entre o bot e a API. Tudo que você cria pelo bot aparece no
dashboard web, e vice-versa.

Ele usa **long polling** (não webhook), então só precisa estar rodando na sua
máquina/servidor — não precisa de domínio nem HTTPS público. Migrado da
lib Telegraf para [grammY](https://grammy.dev) + `@grammyjs/conversations`
nesta fase.

### Multi-tenant: vinculando seu chat à sua conta

Diferente das fases anteriores (bot de uso pessoal único, atrelado a um chat
id fixo em `TELEGRAM_ALLOWED_CHAT_ID`), o bot agora aceita qualquer chat e
resolve **qual conta** cada chat pertence via `User.telegramChatId`:

1. Na primeira interação (qualquer botão do menu), se o chat ainda não está
   vinculado a nenhuma conta, o bot pede o **ID da conta** — visível em
   `/minha-conta` no site, seção "Bot do Telegram" (mostrado ali como texto
   simples, para copiar e colar).
2. O bot confirma que o ID existe e vincula `User.telegramChatId = <chat id>`
   (recusa se esse chat já estiver vinculado a outra conta — nesse caso, é
   preciso desvincular pelo site primeiro: apagar o campo Chat ID em
   `/minha-conta` e salvar).
3. Toda operação seguinte nesse chat já resolve a conta automaticamente, sem
   pedir o ID de novo.

### Plano ativo obrigatório

Depois de vinculado, o bot verifica `hasActivePlan` (mesma função de
`api/src/lib/plan.ts`, usada pelo dashboard e pelo checkout). **Conta no
plano gratuito não pode usar o bot** — em vez de bloquear e mais nada, o bot
oferece assinar um plano ali mesmo, no chat:

- Botões para escolher Mensal (R$ 9,90) ou Anual (R$ 99,90);
- Gera a cobrança PIX (`paymentService.createPixCheckout`, mesma lógica do
  `/checkout` web) e envia o **QR code como foto** e o **código copia-e-cola**
  como texto monoespaçado (toque para copiar no Telegram);
- Botão "🔄 Verificar pagamento" reconsulta o status (mesma reconsulta
  direta à AbacatePay do endpoint web, útil porque o bot roda sem endpoint
  HTTPS público para receber webhook);
- Com `ABACATEPAY_PIX_TEST_MODE=true`, um botão extra "🧪 Pagar PIX Teste
  Mode" simula o pagamento (sandbox da AbacatePay) — o bot avisa "Esse PIX
  será pago em 10 segundos..." e, depois desse intervalo, confirma o
  pagamento e a data de expiração do plano, tudo pelo chat.
- Ao confirmar, o fluxo que o usuário estava tentando fazer (despesa,
  receita, etc.) continua normalmente.

### Modelo de segurança

1. **Vínculo de conta obrigatório** — sem vincular um ID de conta válido, o
   bot não executa nenhuma operação sobre dados.
2. **Plano ativo obrigatório** — sem plano ativo, o bot só oferece o fluxo
   de assinatura, nada mais.
3. **Senha pessoal por operação** — toda ação que lê ou grava dados de
   transações (Despesa, Receita, Transações, Resumo, Buscar, Apagar,
   Relatório PDF) pede a senha pessoal configurada em
   `BOT_PASSWORD_HASH_BASE64` antes de continuar. Ela nunca fica salva em
   texto plano: só o hash bcrypt é guardado, e a mensagem com a senha é
   apagada do chat automaticamente logo depois de lida.

   > Essa senha continua sendo **uma única senha compartilhada**, configurada
   > uma vez no `.env` do bot — não é uma senha por conta/usuário. Criar
   > autenticação por usuário exigiria um mecanismo novo (ex.: PIN por conta,
   > hash guardado no banco) fora do escopo explícito desta fase; documentado
   > aqui como limitação conhecida, não implementado às pressas.
4. **Bloqueio por tentativas erradas** — `BOT_MAX_ATTEMPTS` senhas erradas
   seguidas (padrão 5) bloqueiam novas tentativas por `BOT_LOCKOUT_MINUTES`
   (padrão 15). O contador fica em memória do processo do bot, por chat id.

## Setup local

### 1. Criar o bot no @BotFather (se ainda não tiver um)

No Telegram, converse com [@BotFather](https://t.me/BotFather), envie
`/newbot`, escolha um nome e um username terminado em `bot`. Ele te dá um
token no formato `123456789:AAAA...` — é o `TELEGRAM_BOT_TOKEN`.

### 2. Configurar `bot/.env`

```bash
cp bot/.env.example bot/.env
```

Preencha:

- `DATABASE_PROVIDER`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`
  — **os mesmos valores** do seu `api/.env` (o bot reusa o módulo de config da
  API, que valida esse schema inteiro mesmo sem usar autenticação/e-mail). Se
  você rodou um dos scripts `setup-*.sh` da raiz, isso já foi feito
  automaticamente.
- `ENABLE_ABACATEPAY`/`ABACATEPAY_API_KEY`/`ABACATEPAY_PIX_TEST_MODE` — os
  mesmos valores do `api/.env`, necessários para o fluxo de assinatura pelo
  chat funcionar.
- `TELEGRAM_BOT_TOKEN` — do passo 1.
- `BOT_PASSWORD_HASH_BASE64` — gere com:

  ```bash
  cd bot
  bun run hash-password "sua-senha-pessoal"
  ```

  Copie a linha `BOT_PASSWORD_HASH_BASE64=...` que o comando imprime.

  > Por que base64 e não o hash direto? Um hash bcrypt tem `$` literais
  > (`$2b$10$...`), e tanto o parser de `.env` do Bun quanto o do Docker
  > Compose tentam expandir `$` como se fosse referência a outra variável —
  > cada um com uma sintaxe de escape diferente e incompatível entre si.
  > Base64 evita o problema nos dois lugares ao mesmo tempo.

### 3. Rodar

```bash
bun run bot:dev
```

Você deve ver `🤖 Bot do Telegram rodando (long polling)...` no terminal.
Abra uma conversa com o seu bot no Telegram e envie `/start`.

## Usando o bot

`/start` mostra um menu de botões (nenhum comando de barra além de
`/start`/`/cancelar` — a Fase 9 substituiu os comandos por um menu clicável):

| Botão | O que faz |
|---|---|
| 💸 Despesa / 💰 Receita | Registra uma transação (valor → categoria → descrição → confirmar) |
| 📃 Transações | Lista as transações mais recentes, com paginação |
| 📊 Resumo | Receitas, despesas, saldo e totais por categoria |
| 🔎 Buscar | Busca por categoria, nome, período, ano, mês, última semana ou últimos 30 dias |
| 🗑️ Apagar | Busca por nome e apaga a transação escolhida (com confirmação) |
| 📄 Relatório PDF | Gera um PDF com totais e gráfico de barras por categoria, últimos 7 ou 30 dias |
| 📂 Categorias | Lista as categorias válidas (mesmas do dashboard) |
| ❓ Ajuda | Reexibe o menu |

`/cancelar` sai da operação atual a qualquer momento — inclusive de dentro
de um fluxo travado (mensagem inesperada, tipo de mídia não suportado,
etc.), o que evita loops sem saída.

**Um fluxo por vez.** Enquanto uma operação está no meio de uma conversa
(ex: esperando você digitar o valor da despesa), outras não funcionam — use
`/cancelar` primeiro para sair e começar outra.

### Exemplo de conversa

```
Você: [💸 Despesa]
Bot:  🔒 Digite sua senha pessoal para continuar:
Você: ••••••••
Bot:  💰 Qual o valor da despesa? (ex: 49.90)
Você: 35.90
Bot:  📂 Escolha a categoria:  [botões]
Você: [Alimentação]
Bot:  📝 Descreva a transação (ex: Supermercado, Uber, Salário...):
Você: iFood
Bot:  Confirma a despesa abaixo?
      Valor: R$ 35,90
      Categoria: Alimentação
      Descrição: iFood
      [✅ Confirmar]  [❌ Cancelar]
Você: [✅ Confirmar]
Bot:  ✅ Despesa registrada com sucesso!
```

## Relatório em PDF

O botão "📄 Relatório PDF" gera um documento com o total de receitas,
despesas e saldo do período, mais um gráfico de **barras horizontais** por
categoria (despesas e receitas separadas). A escolha de barras em vez do
gráfico de pizza do dashboard web é deliberada: `pdfkit` é uma API de
desenho vetorial, e desenhar retângulos proporcionais ao valor de cada
categoria é muito mais simples e robusto do que calcular arcos SVG para um
gráfico de pizza — a informação (total por categoria) é a mesma. Ver
`bot/src/lib/pdf-report.ts`.

## Testes

```bash
cd bot
bun run test:unit   # lógica pura: senha, bloqueio, datas, formatação, valor
bun run test        # inclui também o smoke test de wiring do bot (createBot())
```

Nenhum teste faz chamada real ao Telegram ou à AbacatePay. As conversations
do grammY (fluxos de várias etapas, como Despesa ou Buscar) **não têm teste
de integração automatizado** — reproduzir fielmente o motor de replay do
`@grammyjs/conversations` (que reexecuta a função da conversation a cada
`wait()`) exigiria um harness bem mais complexo que o valor que agregaria
aqui, na mesma linha da decisão já documentada em `docs/autenticacao.md`
sobre os caminhos de 2FA no login. Em vez disso, toda a lógica pura por trás
desses fluxos (parse de valor, avaliação de senha/bloqueio, intervalos de
data, formatação) fica em módulos separados e testados diretamente
(`lib/parse-amount.ts`, `lib/verify-password-step.ts`, `date-ranges/`,
`formatting/`) — os fluxos completos foram verificados manualmente.

## Rodando via Docker

```bash
bun run docker:sqlite:up    # sobe api + frontend + bot, todos usando o mesmo dev.db
```

O serviço `bot` no `docker-compose.sqlite.yml`/`docker-compose.yml` usa
`bot/.env` (via `env_file`) e compartilha o mesmo banco (`sqlite_data` ou
Postgres) que a API. Ele não expõe porta — só faz long polling para fora.

> O bot não está incluído em `docker-compose.prod.yml`: é uma ferramenta de
> uso pessoal local, com long polling; deploy em VPS/produção está fora do
> escopo atual (ver "Fora de escopo" em `telegram-bot-plan.md`).

## Segurança do token

O token do bot (`TELEGRAM_BOT_TOKEN`) só vive em `bot/.env`, que está no
`.gitignore` — nunca é commitado. Se o token vazar (por exemplo, foi colado
em algum chat ou log), revogue-o e gere um novo com `/revoke` no @BotFather.
