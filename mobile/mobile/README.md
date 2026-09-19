# op — Protótipo de Finanças Pessoais

Aplicativo mobile (Expo + React Native) para controle de receitas e despesas, com
autenticação local por e-mail/senha e um dashboard de CRUD de transações. Os dados
ficam em um banco SQLite local no dispositivo — não há sincronização em nuvem nesta
fase.

## Como rodar

Pré-requisitos: [Bun](https://bun.sh) e o app **Expo Go** instalado no celular.

```bash
bun install
bunx expo start
```

Com o Metro rodando, escaneie o QR Code com o app Expo Go (Android) ou pela câmera
(iOS). O celular e o computador precisam estar na mesma rede Wi-Fi. Se a rede
bloquear a conexão direta, use `bunx expo start --tunnel`.

Fluxo de teste no dispositivo:

1. Criar uma conta em **Criar conta** (e-mail + senha, mínimo 6 caracteres).
2. A sessão é persistida; ao fechar e reabrir o app você continua logado.
3. No dashboard, tocar em **Nova transação** para adicionar uma receita e uma
   despesa em categorias diferentes.
4. O **Saldo do período** (receitas − despesas) é recalculado e exibido em BRL e
   reflete os filtros ativos (categoria, busca e intervalo de datas).
5. Tocar em uma transação para **editar**; usar **Excluir** (na linha ou dentro do
   formulário) para remover, com confirmação.
6. Usar a **busca por descrição**, os campos **De/Até** (calendário) e a navegação
   entre páginas (10 transações por página).
7. Abrir **Perfil** no cabeçalho do dashboard para editar o nome de exibição e
   trocar a senha.
8. **Sair** limpa a sessão e volta para a tela de login.

## Dependências adicionadas nesta fase

Instaladas com `bunx expo install` (versões alinhadas ao SDK 57):

- **`@react-native-community/datetimepicker`** (`9.1.0`) — date picker nativo usado
  no formulário de transação e nos filtros de período do dashboard.
- **`expo-auth-session`** (`~57.0.11`) — fluxo OAuth de login social com Google
  (implementado, porém desativado — ver abaixo). Usa `expo-web-browser`
  (`~57.0.2`), que já é dependência do projeto.
- **`expo-local-authentication`** (`~57.0.2`) — autenticação biométrica nativa
  (Face ID / Touch ID / digital / PIN), implementada, porém desativada.

As animações usam **`react-native-reanimated`**, que já fazia parte do projeto
(SDK 57) — ver a decisão sobre `moti` abaixo.

## Estrutura de pastas

```
src/
  app/                     Rotas (Expo Router, file-based)
    _layout.tsx            Provider de tema/sessão + Stack raiz
    index.tsx              Redireciona para /dashboard ou /login conforme a sessão
    (auth)/
      _layout.tsx          Bloqueia acesso se já autenticado
      login.tsx            Tela de login + botão "Entrar com Google" (desativado)
      signup.tsx           Tela de cadastro
    (app)/
      _layout.tsx          Rota protegida; redireciona para /login sem sessão
      dashboard.tsx        Saldo, filtros (categoria/busca/datas), paginação e lista
      profile.tsx          Editar nome, trocar senha e toggle de biometria (desativado)
      transaction/[id].tsx Formulário de criar/editar/excluir (id = "new" para criar)
  components/ui/           Componentes visuais reutilizáveis
    button.tsx  chip.tsx  text-field.tsx  date-field.tsx (campo + date picker nativo)
  context/
    auth.tsx              AuthProvider + hook useAuth (sessão em memória + SQLite)
  lib/
    db.ts                 Abertura do SQLite e migração versionada do schema
    auth.ts              Cadastro/login, perfil, troca de senha, Google e biometria
    transactions.ts      CRUD, filtros, paginação e cálculo de saldo
    categories.ts        Categorias dinâmicas por tipo (receita/despesa)
    format.ts            Formatação/parse de BRL (com máscara) e de datas
```

## Decisões assumidas

### Base (fase 1)

- **SDK / stack**: projeto criado com `create-expo-app` (template padrão), que já
  vem com Expo Router e TypeScript. Rotas ficam em `src/app`.
- **Componentes de UI**: em vez de instalar o CLI do `react-native-reusables`
  (que exige passos interativos), foram criados componentes equivalentes e enxutos
  (`Button`, `TextField`, `Chip`, `DateField`) no mesmo espírito (shadcn/ui para
  RN), estilizados com NativeWind. Mantém o protótipo simples e sem etapas manuais
  de setup.
- **Hash de senha**: `expo-crypto` com SHA-256 e um salt aleatório de 16 bytes por
  usuário. É suficiente para um protótipo local; não é adequado para produção
  (onde se usaria um KDF como bcrypt/scrypt/Argon2).
- **Persistência de sessão**: tabela `session` de uma linha no próprio SQLite
  guardando o `user_id` logado — evita adicionar dependências como AsyncStorage
  ou SecureStore.
- **Valores monetários**: armazenados como inteiro em centavos (`amount_cents`)
  para evitar erros de ponto flutuante. Formatação BRL feita manualmente
  (`R$ 1.234,56`), sem depender de `Intl`.
- **typedRoutes**: desativado em `app.json` para evitar ruído de tipos com rotas
  dinâmicas; não afeta o funcionamento em runtime.

### Fase 2

- **Migração de schema**: `db.ts` passou a usar `PRAGMA user_version`. A versão 2
  adiciona as colunas `name`, `google_id` e `biometric_enabled` à tabela `users`
  via `ALTER TABLE` idempotente, preservando bancos já criados na fase 1.
- **Máscara de valor (BRL)**: o campo de valor agora é uma máscara — o usuário
  digita apenas dígitos, interpretados como centavos, e o texto é formatado como
  `1.234,56` em tempo real. Limites de `R$ 0,01` a `R$ 999.999,99` validados no
  submit, com mensagem de erro clara. O parser textual antigo (`parseBRLToCents`)
  foi mantido para compatibilidade.
- **Date picker**: `@react-native-community/datetimepicker` encapsulado em
  `components/ui/date-field.tsx`. No Android abre o diálogo nativo; no iOS usa o
  modo `inline` com botão "Concluir". O mesmo componente é usado no formulário de
  transação e nos filtros de período.
- **Categorias dinâmicas**: listas separadas para receita e despesa em
  `lib/categories.ts`. Ao trocar o tipo no formulário, a categoria selecionada é
  redefinida para a primeira da nova lista. O filtro de categoria do dashboard usa
  a união das duas listas (sem duplicatas) mais a opção "Todas".
- **Paginação**: 10 transições por página, resolvida no SQLite com `LIMIT/OFFSET` e
  um `COUNT(*)` para o total. Navegação com botões "Anterior"/"Próxima" e indicador
  "Página X de Y". A página volta para 1 sempre que um filtro muda.
- **Filtros combináveis**: busca por texto (`LIKE` em `LOWER(description)`, com
  debounce de 300 ms) e intervalo de datas (`date >= ?` / `date <= ?`) são
  aplicados juntos, junto com o filtro de categoria e a paginação. O card de saldo
  usa uma agregação SQL (`SUM ... GROUP BY type`) sobre o mesmo conjunto filtrado.
- **Filtro de categoria mantido**: a fase 1 já tinha filtro por categoria no
  dashboard; ele foi preservado e passou a conviver com os novos filtros, em vez
  de ser removido.
- **Animações — `moti` não foi usado**: o projeto está no `react-native-reanimated`
  4.5.1 (SDK 57 / Nova Arquitetura), e o `moti` ainda é oficialmente baseado no
  Reanimated 3, com incompatibilidades relatadas no Reanimated 4. Para não
  arriscar quebrar o build, as animações foram feitas com as APIs nativas do
  Reanimated 4 (`FadeIn`/`FadeOut`/`FadeInDown`/`FadeInUp` e `LinearTransition`).
  São discretas: entrada dos itens da lista, reflow ao paginar/excluir, entrada do
  formulário no modal e das mensagens de erro/sucesso.
- **Seção de Perfil como tela empilhada (não aba)**: adicionar uma `Tab bar`
  exigiria reestruturar a navegação protegida. Optou-se por uma rota `profile`
  empilhada, acessível por um botão **Perfil** no cabeçalho do dashboard. Permite
  editar o nome de exibição e trocar a senha (senha atual + nova + confirmação),
  persistindo no SQLite.
- **Nome de exibição**: derivado automaticamente do e-mail no cadastro (parte antes
  do `@`, capitalizada) e editável na tela de Perfil. O cabeçalho do dashboard
  passa a mostrar o nome (com fallback para o e-mail).
- **Login com Google (implementado e desativado)**: fluxo completo em
  `app/(auth)/login.tsx` com `Google.useAuthRequest` (`expo-auth-session/providers/
  google`), busca do perfil em `googleapis.com/userinfo/v2/me` e upsert/vínculo do
  usuário no SQLite (`signInWithGoogleProfile`, por `google_id` ou e-mail). O botão
  "Entrar com Google" aparece **desabilitado** (acinzentado); a chamada real
  `promptAsync()` está comentada em `onGooglePress`, junto da instrução para
  reativar (preencher `GOOGLE_CONFIG` com Client IDs OAuth e trocar
  `GOOGLE_LOGIN_ENABLED` para `true`).
- **Biometria (implementada e desativada)**: fluxo completo em
  `app/(app)/profile.tsx` (`runBiometricAuthentication`) com
  `expo-local-authentication` — checagem de `hasHardwareAsync`/`isEnrolledAsync` e
  `authenticateAsync` com fallback de PIN do dispositivo. O toggle "Usar biometria
  para entrar" aparece **desabilitado** (acinzentado); a chamada real está
  comentada em `onToggleBiometric`, com instrução para reativar (trocar
  `BIOMETRICS_ENABLED` para `true` e gerar um build). A preferência é persistida na
  coluna `users.biometric_enabled`. O plugin `expo-local-authentication` foi
  adicionado em `app.json` com a mensagem de permissão de Face ID.
- **Comentários no código**: mantida a regra de não comentar, com a exceção
  explícita dos dois fluxos desativados (Google e biometria), onde a chamada real
  fica comentada no ponto de invocação com uma linha explicando como reativar.
- **Sem nuvem/PowerSync e sem testes automatizados** — conforme o escopo desta fase.
