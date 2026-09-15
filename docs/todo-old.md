# Refatoração Completa — App de Finanças Pessoais (Web + Bot Telegram)

## Papel

Você é um(a) engenheiro(a) de software sênior full-stack, especialista em Next.js, React, TypeScript, arquitetura de sistemas de pagamento (PIX) e bots do Telegram. Você vai atuar como responsável técnico por uma refatoração grande em um projeto já existente e em produção/desenvolvimento.

## Objetivo

Refatorar e evoluir o projeto de finanças pessoais (web + bot do Telegram) descrito abaixo, entregando um resultado em produção-ready, testado, documentado e sem regressões nas funcionalidades já existentes que não foram mencionadas neste prompt.

---

## Processo obrigatório (siga nesta ordem, sem pular etapas)

1. **Explorar o código antes de qualquer alteração.** Mapeie a estrutura de pastas, stack atual, bibliotecas em uso, padrões de nomenclatura, banco de dados/ORM, sistema de autenticação, integração atual com Telegram e com o gateway de pagamento. Não assuma nada que não esteja no código.
2. **Planejar antes de codar.** Use as skills/plugins de Next.js, React, boas práticas web, UI/UX que já estão instalados neste ambiente para montar um plano técnico (arquivos afetados, novos módulos, migrations necessárias, ordem de implementação).
3. **Rodar a skill/plugin "GRILL-ME" e me fazer TODAS as perguntas relevantes antes de tomar qualquer decisão de arquitetura, biblioteca ou UX que não esteja 100% explícita neste prompt.** Não decida por conta própria em pontos ambíguos — pergunte. Veja a seção **"Pontos que exigem confirmação minha"** no final deste documento como ponto de partida (a lista não é exaustiva: adicione qualquer outra dúvida que surgir ao explorar o código).
4. **Só depois de eu responder às perguntas, comece a implementar.**
5. **Implemente em fases/PRs pequenos e independentes** (ver seção "Fases sugeridas"), não em um único commit gigante. Ao final de cada fase, resuma o que foi feito antes de seguir para a próxima.
6. **Teste cada fase antes de avançar** para a próxima.
7. **Documente continuamente**, não apenas no final.

---

## Regras não negociáveis (aplicam-se a todo o código, em todas as fases)

### Arquitetura e qualidade

- Clean Code, Clean Architecture, DRY, KISS, SOLID e Design Patterns onde fizer sentido — sem over-engineering.
- TypeScript estrito: sem `any`, com tipos de retorno explícitos em funções públicas.
- Comentários apenas para casos de borda, decisões não óbvias ou o "porquê" — nunca repetindo o que o código já diz.
- Use apenas versões estáveis (latest stable) de bibliotecas — nunca `rc`, `beta`, `canary` ou `nightly`, inclusive em imagens Docker (prefira imagens baseadas em Bun às baseadas em Node quando disponíveis e estáveis).
- Runtime/gerenciador de pacotes: Bun (v1.4+).

### Testes

- Crie testes unitários, de integração e e2e para **cada** feature nova ou alterada.
- Rode a suíte de testes existente para garantir que nada quebrou antes de finalizar cada fase.

### Documentação

- Atualize o `CHANGELOG.md` a cada mudança relevante (formato [Keep a Changelog](https://keepachangelog.com/), com data e categoria: Added/Changed/Fixed/Removed).
- Documente cada novo fluxo/feature dentro da pasta `docs/` (um arquivo por domínio: autenticação, pagamentos, bot do Telegram, dashboard, etc.).

### Definição de "pronto" (Definition of Done) por fase

Uma fase só é considerada concluída quando:

- [ ] Código implementado seguindo as regras acima
- [ ] Testes unitários/integração/e2e criados e passando
- [ ] `CHANGELOG.md` atualizado
- [ ] Documentação em `docs/` atualizada
- [ ] Nenhuma funcionalidade pré-existente quebrada

---

## Fases sugeridas (implemente nesta ordem)

### Fase 0 — Levantamento e plano

Exploração do código + plano técnico + perguntas via GRILL-ME (etapas 1 a 3 do processo acima).

### Fase 1 — Rotas em português

Renomear as seguintes rotas (URL) de inglês para português, atualizando todos os links internos, redirects e metadados de SEO:

| Rota atual | Nova rota |
| --- | --- |
| `/contact` | `/contato` |
| `/login` | `/entrar` |
| `/signup` | `/criar-conta` |
| `/policy` | `/politica-de-privacidade` |
| `/terms` | `/termos-de-uso` |
| `/profile` | `/minha-conta` |
| `/dashboard` | `/dashboard` (mantém) |
| `/forget-password` | `/esqueci-senha` |
| `/reset-password` | `/resetar-senha` |
| `/confirm-email` | `/confirmar-email/{token}` |

### Fase 2 — Landing page (`/`)

**Layout e tema**

- Tema exclusivamente dark, tipografia principal em branco, forte inspiração visual em [resend.com](https://resend.com/) — incluindo, se possível, a tipografia usada por eles.
- Viewport único: a landing page deve ocupar 100% de altura e largura da tela, sem scroll.
- Traduzir para português qualquer texto em inglês visível na interface.

**Hero section**

- Remover os botões da hero section.
- Grid de duas colunas: título "Suas Finanças. No Telegram." à esquerda; à direita, um celular em 3D animado/rodando (estilo resend.com) — implemente com alguma biblioteca 3D adequada (ex.: Three.js/React Three Fiber ou equivalente já usado no projeto, a definir na Fase 0).

**Navbar**

- Apenas o nome da aplicação ("Money") no canto esquerdo.
- Apenas o botão "Entrar" no canto direito.

**Footer**

- No canto direito: links de Contato, Política de Privacidade, Termos de Uso, seguidos do botão de alternar tema (dark/light toggle).

### Fase 3 — Autenticação e controle de acesso

- Usuário autenticado não pode acessar: `/`, `/entrar`, `/criar-conta`, `/esqueci-senha`, `/resetar-senha` (redirecionar para `/dashboard` ou equivalente).

### Fase 4 — Fluxo de login, confirmação de e-mail e 2FA

- Cadastro via Google: `confirmed_email` já nasce `true`.
- Cadastro via e-mail/senha com `ENABLE_CONFIRM_EMAIL=true`: enviar e-mail de confirmação e exibir mensagem informando que o e-mail foi enviado e precisa ser confirmado antes do acesso.
- Tentativa de login sem e-mail confirmado: exibir tela pedindo confirmação, com link "Reenviar link para confirmar e-mail".
- 2FA (desativado por padrão, ativado pelo usuário em `/minha-conta`): se ativo, após login (e-mail/senha ou Google) abrir modal pedindo os 6 dígitos (padrão Google Authenticator/TOTP), com link alternativo "Enviar códigos por e-mail".

### Fase 5 — Dashboard (`/dashboard`)

**Header/navbar**

- Remover a palavra "Dashboard" da UI.
- Canto direito: dropdown com o nome do usuário logado contendo os itens "Minha Conta" (`/minha-conta`) e "Sair" (logout).
- À esquerda do dropdown, 3 botões com efeito hover:
  - "Adicionar Despesa" — vermelho, texto preto
  - "Adicionar Receita" — verde, texto preto
  - "Importar" — roxo (cor Nubank), texto preto

**Cards e layout**

- Coluna esquerda: cards "Despesas por categoria" e "Receitas por categoria", ambos dentro de um accordion (retráteis).
- Coluna direita: lista de transações financeiras.
- Card adicional fixo (sempre aberto, não dentro do accordion): saldo atual do usuário (receitas − despesas).

**Transações**

- Paginação padrão: 10 itens por página.
- Filtros, em duas linhas:
  - Linha 1: busca por nome ocupando a linha inteira, usando `fuse.js`, disparando a partir de 3 caracteres digitados.
  - Linha 2 (`justify-between`): filtro de Categoria, filtro De (data) e filtro Até (data).
- Botões de exportação (topo do card de transações), habilitados apenas quando houver ≥ 1 transação: exportar `.xlsx` e exportar `.csv`.

**Modais de adicionar/editar transação**

- Se for receita: botões e outline dos inputs em verde; incluir input de data da transação com seletor de calendário.
- Se for despesa: manter padrão equivalente (a definir esquema de cores na Fase 0/GRILL-ME, já que o prompt original não especifica a cor para despesa).
- Campo de valor: prefixo com sinal `+`/`−` e um indicador fixo (disabled) "R$"; formatação no padrão monetário BRL.
- Campo de descrição: forçar UPPERCASE, mínimo 4 e máximo 32 caracteres.

### Fase 6 — Página `/minha-conta`

- Exibir dados do plano atual do usuário e histórico de transações/pagamentos; se não houver plano contratado, exibir "Gratuito".
- Configuração de 2FA (ativar/desativar) via app autenticador (TOTP, ex. Google Authenticator).
- Campo para o usuário informar o Chat ID do Telegram, usado para vincular as transações feitas pelo bot.
- **Exclusão de conta:**
  - Modal com as informações necessárias sobre o processo de exclusão.
  - Bloquear exclusão se o usuário tiver algum plano ativo ainda não vencido.
  - Se plano gratuito (sem plano ativo): botão com cooldown de 10 segundos, rotulado "[x] segundos para confirmar exclusão de conta", com aviso de que o usuário tem 30 dias para logar novamente e cancelar a exclusão; após esse prazo, a conta e todos os dados são deletados definitivamente.
- **Limite do plano gratuito:** 10 transações gratuitas totais. Após atingir o limite, desabilitar os botões Importar, Adicionar Receita/Despesa, Exportar .xlsx e Exportar .csv. Persistir e incrementar esse contador no banco a cada transação, bloqueando novas transações ao atingir o limite.

### Fase 7 — Página `/contato`

- Exibir contador regressivo de caracteres, limite de 512, atualizando conforme o usuário digita.
- Se o usuário estiver logado: campos de nome e e-mail pré-preenchidos e desabilitados (`disabled`).
- Select com as opções: "Dúvidas e Sugestões", "Problemas Técnicos e Bugs", "Problemas com Pagamento", "Outros assuntos".
- Remover o texto "Tem dúvidas ou sugestões? Envie uma mensagem.".
- Substituir o texto "Fale conosco" por "Entre em Contato".

### Fase 8 — Pagamentos: migração Stripe → AbacatePay (PIX)

- Remover completamente o fluxo Stripe.
- Integrar com a AbacatePay, **apenas via PIX**, usando obrigatoriamente a **API v2**. Documentação de referência: <https://www.abacatepay.com/llms.txt>
- Criar página `/checkout` com dois planos:
  - R$ 9,90 — 1 mês de acesso
  - R$ 99,90 — 12 meses de acesso (2 meses grátis)
- Ao escolher o plano e clicar em "Pagar com PIX", abrir modal exibindo:
  - Cooldown: "Você tem [x] minutos para pagar esse PIX. Aguardando pagamento..."
  - QR Code do PIX
  - Chave PIX copia-e-cola em texto
  - Cooldown de 60 segundos antes de liberar o botão de fechar o modal: "Você pode fechar essa aba em [x] segundos..."
- Botão "Pagar PIX Teste Mode", visível/ativo apenas quando `ABACATEPAY_PIX_TEST_MODE=true`.
- Webhook da AbacatePay para confirmação automática do pagamento; exibir mensagem "Esse PIX será pago em 10 segundos..." no fluxo de teste.
- Ao confirmar pagamento, atualizar o modal para: "Pagamento realizado com sucesso! Você está no plano PRO até o dia xx/xx/xxxx".
- Registrar em banco de dados todos os logs de pagamento (sucesso e erro) e todos os eventos de webhook recebidos.

### Fase 9 — Bot do Telegram: migração Telegraf → grammY

- Migrar toda a lógica do bot para a biblioteca [grammY](https://grammy.dev/), removendo totalmente a dependência do Telegraf.
- Fluxo de conversa:
  - Ao iniciar uma nova conversa, o bot deve pedir o User ID do usuário.
  - Validar no banco se esse usuário tem plano ativo; se não tiver, informar no chat que o plano não está ativo e que a conta gratuita não pode usar o bot.
  - Substituir comandos de barra (`/cancel`, `/deposit`, etc.) por botões clicáveis (inline keyboard).
  - Cobrir o fluxo com testes e fallbacks de erro/interação, evitando loops travados na conversa.
  - Nas consultas de transações dos últimos 7 e 30 dias: se viável, gerar um PDF com gráficos equivalentes aos do dashboard web e enviá-lo no chat.
  - Se usuário é plano gratuito e está no chat do telegram, implemente o fluxo para o usuário também conseguir pagar algum plano (mensal ou anual) enviando os dados do PIX (qr code e chave pix) no chat do telegram para o usuário pagar. em teste mode, avise que o pagamento será feito em 10 segundos e envie os dados da transação e confirmação de pagamento tudo pelo chat também;

### Fase 10 — Infraestrutura (setup, PM2, Docker, Prisma Studio)

- Nos scripts de subida da aplicação (`.sh`), garantir que o console/logs exibam claramente:
  - A URL de acesso ao Prisma Studio.
  - Os 3 serviços ativos no PM2 e o comando para ver logs em tempo real.
  - Os 3 serviços ativos no Docker e o comando para ver logs em tempo real.

---

## Pontos que exigem confirmação minha (perguntar via GRILL-ME antes de implementar)

- **Biblioteca 3D:** qual usar para o celular 3D da landing page (Three.js puro, React Three Fiber, Spline, outra)? Há alguma já presente no projeto?
- **Cor dos inputs/botões no modal de despesa:** o prompt original define o padrão verde para receita, mas não especifica a cor para despesa — confirmar (provavelmente vermelho, por simetria com o botão "Adicionar Despesa").
- **Regra de exclusão de conta com plano pago ainda vigente:** o usuário pode agendar a exclusão para o fim da vigência, ou simplesmente fica bloqueado até o plano vencer?
- **2FA:** confirmar biblioteca TOTP a ser usada e se já existe alguma dependência/infra de envio de e-mail (para o backup "enviar código por e-mail") no projeto.
- **fuse.js:** confirmar se a busca deve ocorrer no cliente (dados já carregados) ou se precisa de uma chamada ao servidor por termo digitado.
- **Banco de dados/ORM atual:** confirmar schema atual de usuários, transações e planos antes de desenhar as migrations necessárias (contador de transações gratuitas, chat ID do Telegram, status 2FA, etc.).
- **Setup atual de PM2/Docker:** confirmar nomes atuais dos 3 serviços e arquivos de configuração existentes, para não duplicar ou quebrar o setup atual.
- **AbacatePay:** confirmar se já existe conta/credenciais de sandbox configuradas, e se o webhook precisa de um endpoint público (ngrok ou equivalente) para teste local.
- Qualquer outra dúvida que surgir durante a exploração do código na Fase 0 deve ser perguntada aqui também, antes de decidir sozinho.

## ENVs para USAR

### API BACKEND

```
NODE_ENV=development
PORT=4000
API_URL=http://localhost:4000
APP_URL=http://localhost:4001
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db
BETTER_AUTH_SECRET=656c7504bccc5eae8b54f95073228b2d5f17f48aabd22021bb02401a0342153b
ENCRYPTION_KEY=16f87a749d9638c485b4e92698aeb08699a7f5147c2d889b4d474b4284c7ac84
ENABLE_CONFIRM_EMAIL=false
ENABLE_2FA=false
GOOGLE_CLIENT_ID=456689623328-0b2oqc3mmp11hg33vmers1q7q8qld794.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URL={APP_url}/dashboard
RESEND_API_KEY_SANDBOX=re_LbsmLE1t_Ab8riYSMYyCL5zQcaNibBbWJ
RESEND_FROM_EMAIL=onboarding@resend.com
ABACATEPAY_API_KEY_SANDBOX=abc_dev_mwae6mwTjzuZD5R0ApWRAWmB
ABACATEPAY_WEBHOOK_URL_SANDBOX=/webhook/abacatepay
ABACATEPAY_WEBHOOK_SECRET_SANDBOX=CEF9B8447FF29F1E0B2C260406AF00B6
```

### BOT TELEGRAM

```
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:../api/dev.db
BETTER_AUTH_SECRET=656c7504bccc5eae8b54f95073228b2d5f17f48aabd22021bb02401a0342153b
ENCRYPTION_KEY=16f87a749d9638c485b4e92698aeb08699a7f5147c2d889b4d474b4284c7ac84
TELEGRAM_BOT_TOKEN=8660614441:AAGqWaPHJ_43Tofd7jFd4YBg4SbPp8EQAEc
TELEGRAM_ALLOWED_CHAT_ID=1477312913
BOT_PASSWORD_HASH_BASE64=JDJiJDEwJG5qTWdhZ2NtYi93MWV1eGxpYVVCQ091NVFmN3NLSHRKOEZNcjZXM2RFM0NydFpFVENlTEZT
BOT_MAX_ATTEMPTS=5
BOT_LOCKOUT_MINUTES=15
PERSONAL_USER_EMAIL=<aleexgvieira@gmail.com>
```

---

## Formato de saída esperado

- Não crie um único commit/PR gigante — siga a divisão em fases.
- Ao final de cada fase, apresente um resumo em markdown com: o que foi feito, arquivos alterados, testes criados e pendências/decisões que ficaram em aberto.
- Não decida pontos de arquitetura, UX ou biblioteca não especificados aqui sem antes perguntar.
