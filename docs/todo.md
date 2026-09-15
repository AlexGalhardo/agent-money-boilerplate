Agora quero que você faça as correções para mim:

IMPORTANTE: 
- Mude a cor padrão da aplicação do frontend do laranja, para o verde da cor matrix de terminal;
- Use a font: JetBrains Mono

1. No fluxo do telegram, adicione um botão no chat, para que o usuário possa deslogar da sua conta conectada e entrar em outra;

2. Na landing page, remova o item 3D rodando. Deixe apenas o título 'Suas finnaças. Na web. E no Telegram' centralizado no meio da landing page, cada frase em uma linha, e com cores diferentes, usando gradient verde na frase 'Suas finanças.' 'Na web.' de laranja e 'E no Telegram.' de azul
2.1 Mantenha o tamanho do width da landing page com padrão col-lg-6 do bootstrap
2.2 Corrija o bug do botão toggle theme no footer da landing page não funcionando também;

3. No /dashboard, faça as correções:
   a. Na navbar, devem ficar apenas: O titulo do site, os 3 botoões importar, adicionar receita, adicionar despesa e dropbown do usuário logado; 
   b. deixe o texto dos 3 botões com cor branca;
   c. O botão de toggle theme deve sempre ficar no footer, em todas as páginas, como na landing page;
   d. O card 'Saldo atual' deve ficar na esquerda, em cima dos outros 2 cards, ocupando o grid da esquerda;
   e. Nas exportações (xlsx e csv) coloque o sinal de mais + se for receita ou de menos - se for despesa na frente dos valores;
   f. Nos cards 'Despesas por categoria' e 'Receitas por categoria' coloque as informações das despesas em formato linha abaixo do grafico redondo no formato:
       - [Nome da categoria]        [Valor total dessa categoria]
	   - [Nome da categoria]        [Valor total dessa categoria]
	   - etc

4. Na pagina de criar conta /criar-conta:
   - Deixe a primeira letra do nome da pessoa em maiusculo, minimo 4 letras maximo 16 characteres;
   - No input de senha, coloque o icone do olho famoso para visualizar senha e também coloque a validão famosa de senha boa, com letras minusculas, maiusculas, letras, e caracteres especiais; Coloque aqueles alertas de afirmativo e negativo debaixo do input da senha, informando o usuário o que falta para ele criar uma senha forte;
   - Deixe um placeholder em todos os inputs também

5. Altere a aplicação para os setup .sh, em algum momento, perguntar se é para subir a aplicação em TESTE_MODE ou NÃO

Se o usuário escolher subir NÃO EM TESTE MODE com o fluxo de pagamento do abacatepay funcionando (não em teste mode), use essas .envs para eu testar esse fluxo localmente aqui:

ABACATEPAY_API_KEY_SANDBOX=abc_dev_mwae6mwTjzuZD5R0ApWRAWmB
ABACATEPAY_WEBHOOK_URL_SANDBOX=/webhook/abacatepay
ABACATEPAY_WEBHOOK_SECRET_SANDBOX=CEF9B8447FF29F1E0B2C260406AF00B6