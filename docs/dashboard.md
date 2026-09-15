# Dashboard (`/dashboard`)

Guia do dashboard reformulado na Fase 5 da refatoração.

## Header

Sem a palavra "Dashboard" na UI. À esquerda, três botões: "Adicionar
Despesa" (vermelho), "Adicionar Receita" (verde), "Importar" (roxo, cor da
Nubank, `#820AD1`) — os três com texto preto. À direita, `UserMenu`
(`frontend/src/components/user-menu.tsx`): dropdown com o nome do usuário
logado, contendo "Minha Conta" (`/minha-conta`) e "Sair".

## Cards e layout

- **Saldo atual** (`BalanceCard`, `frontend/src/components/balance-card.tsx`):
  card fixo, sempre visível (fora do accordion), logo abaixo do header —
  receitas menos despesas, somadas a partir de `/transactions/statistics`
  (que já ignora os filtros ativos, então o saldo é sempre o saldo real da
  conta, não do recorte filtrado).
- **Despesas por categoria** / **Receitas por categoria**: cada um dentro de
  um `AccordionCard` (`frontend/src/components/accordion-card.tsx`, um
  `<details>`/`<summary>` nativo — sem biblioteca extra), coluna esquerda,
  abertos por padrão. `CategoryPieChart` não desenha mais sua própria borda
  nem título (isso passou a ser responsabilidade do `AccordionCard`, que é o
  único lugar onde o componente é usado).
- **Lista de transações**: coluna direita, card próprio com busca, filtros,
  botões de exportação, tabela e paginação.

## Busca e filtros

- Categoria, "De" e "Até" são filtros de servidor (Prisma `where`, sobre a
  coluna `date` — ver seção "Campo de data" abaixo).
- **Busca por nome usa fuse.js no cliente**, não uma chamada ao servidor por
  termo digitado (decisão tomada no GRILL-ME da Fase 0). Por isso o
  dashboard busca o conjunto inteiro de transações que já passou pelos
  filtros de categoria/data (`perPage: 1000` — ver `FETCH_ALL_PER_PAGE` em
  `dashboard/index.tsx`) e roda o fuse.js sobre esse conjunto no cliente,
  disparando a partir de 3 caracteres digitados. A paginação de 10 por
  página também acontece no cliente, sobre o resultado já filtrado/buscado.
  `perPage` no backend (`listTransactionsQuerySchema`) foi de 100 para 1000
  para viabilizar isso.

## Campo de data da transação (novo nesta fase)

Adicionada a coluna `Transaction.date` (`DateTime`, default `now()`) nos
dois schemas Prisma — migration
`api/prisma/migrations-sqlite/20260914215922_add_transaction_date`.
Representa a data real da transação (editável no formulário, com seletor de
calendário), separada de `createdAt` (quando o registro foi criado no
banco). A listagem e os filtros "De"/"Até" passaram a operar sobre `date`,
não mais `createdAt`. A importação de CSV do Nubank também foi ajustada
para gravar a data do extrato em `date` (antes só existia em `createdAt`) —
sem isso, transações importadas apareceriam sempre "hoje" na lista/filtros
em vez da data real do extrato.

**Sem migration equivalente para Postgres nesta fase** — o repositório não
tem `api/prisma/migrations-postgresql/` versionado (nenhuma migration de
Postgres foi gerada até agora, nem antes desta mudança), então isso fica
pendente para quando alguém rodar `prisma migrate dev` contra um Postgres
real pela primeira vez.

## Modais de adicionar/editar transação

`TransactionForm` (`frontend/src/components/transaction-form.tsx`):

- **Receita**: outline dos inputs e botão em verde (`emerald-500`).
  **Despesa**: vermelho — cor não especificada no prompt original,
  decidida por simetria com o botão "Adicionar Despesa" (ver resposta do
  GRILL-ME da Fase 0).
- Ao clicar "Adicionar Despesa"/"Adicionar Receita", o tipo já vem fixo
  (`fixedType`) e o seletor "Tipo" fica oculto — o botão clicado já
  declara a intenção. Só aparece um seletor "Tipo" editável no modal de
  **editar** uma transação existente, com as cores reagindo ao valor
  selecionado.
- Campo de valor: prefixo `+`/`−` (cor conforme o tipo) e um input
  `disabled` fixo com "R$" ao lado — não faz parte do valor digitado, é só
  indicador visual. O valor em si usa uma máscara simples de centavos
  (dígitos digitados são tratados como centavos, formatados no padrão BRL
  em tempo real).
- Campo de descrição: forçado para maiúsculas (`toUpperCase()` no
  `onInput`), mínimo 4 e máximo 32 caracteres (Zod + `minLength`/`maxLength`
  do input).
- Campo de data: `type="date"` (seletor de calendário nativo do navegador),
  pré-preenchido com a data de hoje ao criar, ou a data existente ao editar.

## Exportação

`frontend/src/lib/export-transactions.ts`, usando a biblioteca `xlsx`
(SheetJS). Os botões "Exportar .xlsx" e "Exportar .csv" ficam no topo do
card de transações, desabilitados quando não há nenhuma transação
carregada. Exportam o conjunto **filtrado e buscado** (`searched`), não
apenas a página atual visível na tabela.
