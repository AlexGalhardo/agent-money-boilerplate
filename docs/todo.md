Corrija os seguintes requisitos:

1. Em <https://expo.dev/accounts/alexgalhardo/projects/elysia-galhardo-finances-mobile/builds/563fd1b3-8bff-402d-a55b-c43ea945910b>, eu recebi o bug a seguir, corrija:

We detected that 'mobile' is a bun workspace
Running "bun install --frozen-lockfile" in /home/expo/workingdir/build directory
bun install v1.3.14 (0d9b296a)
2 | "lockfileVersion": 2,
^
error: Unknown lockfile version
at bun.lock:2:22
UnknownLockfileVersion: failed to parse lockfile: 'bun.lock'
warn: Ignoring lockfile
error: lockfile had changes, but lockfile is frozen

Inconsistent lockfile state
Common causes: a dependency was added/changed in package.json without running bun install, the lockfile is missing, it's out of sync after a merge/rebase, or the bun version differs from the one that generated the lockfile (different versions may produce incompatible lockfile formats). The flag is a CI safety net ensuring exact reproducible installs with no silent lockfile modifications. Verify that your local bun version matches the version used in your build as a first step.

Fail job

Build failed

bun install --frozen-lockfile exited with non-zero code: 1

1. Corrija esse warning aqui quando faço o .\deploy-android-apk.sh:

Found eas-cli in your project dependencies.
It's recommended to use the "cli.version" field in eas.json to enforce the eas-cli version for your project.
Learn more: <https://github.com/expo/eas-cli#enforcing-eas-cli-version-for-your-project>

1. Se isso for um problema também, comente comigo aqui no chat, eu naõ tenho certeza:

Resolved "preview" environment for the build. Learn more: <https://docs.expo.dev/eas/environment-variables/#setting-the-environment-for-your-builds>
No environment variables with visibility "Plain text" and "Sensitive" found for the "preview" environment on EAS.
Environment variables loaded from the "preview" build profile "env" configuration: EXPO_PUBLIC_API_URL.

3.1 Vê se você consegue testar localmente você mesmo usando o EXPO_PUBLIC_API_URL=<https://moneyzin-backend.up.railway.app>

- Essa URL já está atualizado com as alterações em ambiente sandbox

1. Na página /dashboard na pasta frontend/:
    - Aumente o número de rows de 3 para 5 no modal de editar transação quando descrição >= 60 characteres;

2. Na página /minha-conta na pasta frontend/:
    - Existe um bug no contexto de criação de senha automatica quando criado conta com google -> mesmo alterando a senha pela primeira vez, usando a senha criada automaticamente (esse fluxo esta correto e funcionando) -> nas visitas seguintes dessa página de /minha-conta, continua mostrando o alerta azul e a senha pré-preenchida no input da Senha atual, esse comportamente está errado e não deveria estar assim -> corrija;

3. Em todos os setups .sh, ajeite os scripts para quem em TODOS ELES SEMPRE tenha os logs/consoles/echos dos serviços sendo mostrados no terminal, sem rodar em background; Quando eu subo no windows por exemplo, ele sobe o git bash e tals, e fecha o bash quando sobem os serviços; eu não consigo debugar corretamente para saber qual os logs de errors que estão quebrando, seja no bot, frontend, backend ou mobile;
    - Também é muito importante que os setups .sh tenham mecanicas de fallbacks de errors como por exemplo: matar TODAS as portas que vão ser usadas pelos serviços (sempre garantir que porta 4000, 4001 vão estar disponiveis por exemplo), matando processos antigos que já subiram do docker, pm2, ou outros serviços no windows/unix que estejam usando, e deixar isso explicito nos logs também, para o desenvolvedor poder ver e saber o que está acontecendo;

4. No bot do telegram:
   a. Quando eu clicar no botão 'Trocar de conta' -> não peça a senha do usuário para confirmar no chat;
   b. Crie uma env, para fins de teste de feature flag, para ver se vai pedir ou não a senha do usuário para cada transação que ele fizer. A env se chamara TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS=true or false. Ajeite esse fluxo no código, nos setups etc, e deixe como padrão o valor false;

5. Na página /dashboard no contexto do frontend/:
   a. Adicione um novo botão do lado direito do botão exportar .csv, para exportar o em pdf os 3 cards da esquerda: Saldo atual, despesas por categoria e receitas por categoria;
   b. Aumente um pouco o width (largura) da coluna "Valor" para não quebrar o sinal de mais ou menos (- +) quando mostra o valor da transação na tela do frontend;
   c. Na navbar, deixe tudo em UPPERCASE o alerta 'PRO por mais x dias', deixe o botão com bordas mais quadradas, e com um laranja menos vibrante também;

6. Delete e retire totalmente o build do bun .exe do historico do commit para que ele não seja mais comitada - também retire esse build do contexto dos hooks do husky etc
