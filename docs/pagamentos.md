# Pagamentos (PIX via AbacatePay)

Guia do fluxo de pagamentos, migrado de Stripe para AbacatePay (API v2,
Checkout Transparente PIX) na Fase 8 da refatoração. **Removido por
completo** o fluxo Stripe — sem o pacote `stripe`, sem `stripeCustomerId`
no `User`, sem `STRIPE_*` em `env.ts`.

## Planos

Definidos em `api/src/modules/payments/payment.schema.ts`
(`PLAN_DEFINITIONS`):

| Plano | Preço | Duração |
| --- | --- | --- |
| `monthly` | R$ 9,90 | 1 mês |
| `annual` | R$ 99,90 | 12 meses (2 meses grátis em relação ao mensal × 12) |

Pagamento único via PIX — sem renovação automática. Ativar um plano
enquanto outro ainda está vigente **estende** a data de expiração a partir
do maior entre "agora" e `planExpiresAt` atual, em vez de sobrescrever
(`addMonths` em `payment.service.ts`).

## Fluxo de checkout

1. `/checkout` (frontend, protegida) mostra os dois planos. "Pagar com
   PIX" chama `POST /payments/pix/checkout` `{ plan }`, que cria a cobrança
   na AbacatePay (`abacatepay.createPixCharge`, `POST /transparents/create`
   com `method: "PIX"`) e persiste uma linha `PixCharge` (`status:
   "pending"`, guarda `brCode`/`brCodeBase64`/`expiresAt`).
2. O modal `PixCheckoutModal` (`frontend/src/components/pix-checkout-modal.tsx`)
   abre mostrando: contagem regressiva de expiração ("Você tem X minutos
   para pagar esse PIX..."), o QR code (`brCodeBase64` decodificado como
   `data:image/png;base64,...`), o código copia-e-cola com botão de copiar,
   e um botão "Fechar" desabilitado pelos primeiros 60 segundos.
3. O modal faz polling (`GET /payments/pix/:id/status`, a cada 3s) até a
   cobrança sair de `pending`. Esse endpoint reconsulta a AbacatePay
   diretamente (`checkPixCharge`) sempre que o status local ainda é
   `pending` — necessário porque o webhook exige endpoint HTTPS público e
   não alcança `localhost` em dev sem túnel (ngrok ou similar). Se
   `expiresAt` já passou, marca `expired` localmente sem nem chamar a
   AbacatePay.
4. Quando confirmado (local ou via webhook), `activatePlanForCharge` ativa
   o plano do usuário e grava um `PaymentLog` (`eventType: "pix.completed"`,
   `status: "succeeded"`). O modal mostra "Pagamento realizado com sucesso!
   Você está no plano PRO até o dia dd/mm/aaaa.".

## Modo de teste (`ABACATEPAY_PIX_TEST_MODE=true`)

Com a flag ligada, o modal ganha um botão extra "Pagar PIX Teste Mode" —
chama `POST /payments/pix/:id/simulate`, que usa
`abacatepay.simulatePayment` (`POST /transparents/simulate-payment`,
sandbox/devMode da própria AbacatePay) e ativa o plano imediatamente no
backend. No frontend, a mensagem "Esse PIX será pago em 10 segundos..."
fica visível por 10 segundos antes de reconsultar o status — só para dar
ao fluxo de demonstração o mesmo ritmo do fluxo real, o backend já
processa o pagamento de forma síncrona. **Nunca ligar essa flag em
produção** — ela dá acesso PRO sem cobrança real.

## Webhook

`POST /webhook/abacatepay`, registrado na AbacatePay
(`POST /webhooks/create`) como
`<APP_URL>/webhook/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>`.

> **Limitação conhecida**: a documentação pública da AbacatePay
> (`https://docs.abacatepay.com/llms.txt` e páginas ligadas) descreve que
> "payloads são assinados via HMAC com o secret informado", mas **não
> especifica** o cabeçalho HTTP que carrega essa assinatura nem o formato
> exato do payload. Diante dessa lacuna, a verificação aqui usa o
> parâmetro de query `webhookSecret` (comparado a
> `env.ABACATEPAY_WEBHOOK_SECRET`) — o mesmo padrão do campo `secret`
> documentado em `POST /webhooks/create`. **Antes de ir para produção**,
> confirme no painel da AbacatePay (seção de webhooks) o mecanismo real de
> assinatura entregue e ajuste `paymentWebhookRoutes` em
> `payment.routes.ts` se for diferente (ex.: um cabeçalho HMAC).

Eventos tratados (`payment.service.ts#handleWebhookEvent`):

- `transparent.completed` → ativa o plano (idempotente — não reativa se já
  `paid`) e loga `succeeded`.
- `transparent.refunded` / `transparent.disputed` / `transparent.lost` →
  marca o `PixCharge` como `failed` e loga `failed`.
- Evento para uma cobrança desconhecida (`externalId` sem `PixCharge`
  correspondente) é ignorado silenciosamente — não é erro, só significa
  que a cobrança não veio do nosso `/checkout`.

## Logs de pagamento

`PaymentLog` (renomeado de `stripeEventId` para `externalId`, campo
genérico) registra **todo** evento de pagamento — criação de cobrança
(`pix.created`), confirmação (`pix.completed`, `succeeded`) e falhas
(`failed`), tanto os disparados pelo polling quanto pelo webhook.
`GET /payments/history` lista tudo, mais recente primeiro, exibido em
`/minha-conta`.

## Variáveis de ambiente

```
ENABLE_ABACATEPAY=true        # expõe o botão "Assinar um plano" e a página /checkout
ABACATEPAY_API_KEY=...        # chave da AbacatePay (sandbox ou produção)
ABACATEPAY_WEBHOOK_SECRET=... # comparado ao ?webhookSecret= do endpoint de webhook
ABACATEPAY_PIX_TEST_MODE=true # NUNCA em produção — libera o botão/endpoint de simulação
```

## Cronjob de expiração

Inalterado desde a Fase 6: `GET /cron/check-expired-plans`
(`Authorization: Bearer <CRON_SECRET>`) marca `planStatus: "expired"` para
quem passou de `planExpiresAt`. Não depende de Stripe nem AbacatePay — só
olha `User.planStatus`/`planExpiresAt`.
