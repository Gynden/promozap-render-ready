# PromoZap - progresso

## Feito
- app_init criado em /home/user/promozap
- design.md escrito
- deps instaladas: @whiskeysockets/baileys, qrcode, pino, @hapi/boom, @types/qrcode
- schema.ts (settings, providerConfigs, deals, manualPosts) + db:push OK
- whatsapp/service.ts (baileys, QR, singleton via globalThis, groups, send text/image)
- providers/types.ts (PROVIDERS meta, ProviderConfig, FetchedDeal)
- providers/link.ts (detectLinksInText, applyAffiliateTag, replaceLinksWithAffiliate)
- providers/mercadolivre.ts (busca real via API pública search)
- providers/amazon.ts (PA-API v5 com assinatura SigV4 manual - precisa de chaves reais pra validar)

## Testado e funcionando
- QR code gerado e servido via /api/whatsapp/status
- CRUD de settings por provedor
- Conversor manual: detecta link ML e troca por link com tag (?matt_tool=) quando configurado
- bun run build passa limpo

## Falta
- providers/shopee.ts (stub - Affiliate Open API GraphQL, precisa appId/secret)
- providers/magalu.ts (stub - sem API pública documentada, fallback so link tag)
- providers/index.ts (registry: fetchDeals(providerId, config) dispatch)
- routes: whatsapp.ts, settings.ts, deals.ts, manual.ts -> chain em src/api/index.ts
- upload de imagem pro conversor manual (salvar em .data/uploads, servir estático)
- frontend: sidebar/layout, pages: dashboard, connect (QR), deals (fila revisão), manual (conversor), settings
- background interval: checar providers "automatic" periodicamente e auto-enviar
- iniciar conexão whatsapp automaticamente no boot do server (server.ts) sem duplicar em dev/HMR
- bun run build pra validar
- pedir ao usuário credenciais reais via ask_secrets SOMENTE quando ele for configurar (settings page tem inputs, não obrigatório preencher agora)
- deliver no final (website + porta 4200)

## Decisões
- Amazon: tag param é oficial e correto (Associates). ML/Shopee/Magalu: fallback de query param, sem garantia de ser o formato oficial do link curto deles (avisar no settings).
- Single-user, sem auth (roda local no PC do dono).
- Envio manual só texto+imagem (sem grupos de terceiros, sem leitura automática).
