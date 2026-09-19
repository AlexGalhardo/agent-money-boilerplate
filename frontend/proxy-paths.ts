// Prefixos de rota da API que o frontend encaminha como se fossem dele (ver
// frontend/server.ts em produção e o `server.proxy` do vite.config.ts em
// dev) — a única forma do cookie de sessão (emitido pela API) ficar
// acessível tanto pro SSR do frontend (getServerSession) quanto pras
// chamadas autenticadas do navegador (authClient, eden `api`), já que
// frontend e API são domínios diferentes no Railway. `/webhook` e `/cron`
// ficam de fora de propósito: são chamados direto na API por serviços
// externos (AbacatePay, um cron externo), nunca pelo navegador.
export const PROXIED_API_PATHS = ["/auth", "/users", "/transactions", "/payments", "/config", "/telegram"];
