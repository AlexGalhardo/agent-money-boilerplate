# Contato (`/contato`)

Guia da página de contato, ajustada na Fase 7 da refatoração.

## Formulário

`frontend/src/routes/contato.tsx`, validado com Zod, sem chamada ao backend
(o envio real fica fora de escopo desta fase — apenas confirma
visualmente e limpa o formulário).

- **Nome/e-mail pré-preenchidos**: com o usuário logado (`useSession`), os
  dois campos vêm preenchidos com `session.user.name`/`session.user.email`
  e ficam `disabled` — o visitante não logado vê os campos vazios e
  editáveis normalmente.
- **Assunto**: `<select>` obrigatório com quatro opções fixas — "Dúvidas e
  Sugestões", "Problemas Técnicos e Bugs", "Problemas com Pagamento",
  "Outros assuntos" (valores internos `questions`/`bugs`/`payment`/`other`,
  validados via `z.enum`).
- **Mensagem**: contador de caracteres ao vivo no formato `n/512`, atualizado
  a cada tecla (`onChange` + `maxLength={512}` no textarea, mínimo 10
  caracteres). O limite de 512 é validado tanto pelo atributo HTML quanto
  pelo schema Zod (`max(512)`), então colar um texto maior que 512 é
  truncado pelo próprio campo antes mesmo de a validação rodar.
- Título trocado de "Fale conosco" para **"Entre em Contato"**, e removido o
  texto de apoio "Tem dúvidas ou sugestões? Envie uma mensagem." — o prompt
  original pedia os dois ajustes sem alternativa de copy.
