# PromoZap — Design System

Painel local (PT-BR) para automação de promoções via WhatsApp. Uso pessoal, single-user, roda no PC do dono.

## Vibe
Ferramenta de "operador" — direto ao ponto, denso em informação, parece um painel de controle/trading desk, não um app consumer fofo. Dark-first.

## Typography
- Display/headings: **Sora** (weight 600-700)
- Body/UI: **Inter** (400-500)
- Mono (para preços, links, IDs, JSON de API): **JetBrains Mono**

## Color
Dark base, um único accent forte.

- Background base: `#0B0E11`
- Surface: `#12161C`
- Surface elevated / cards: `#171C24`
- Border: `#232A34`
- Text primary: `#EDF1F5`
- Text muted: `#8B95A3`
- Accent (brand): `#25D366` (verde WhatsApp — reforça o tema) usado com moderação, só CTAs e status positivos
- Accent secondary (links/ações): `#3BA7FF`
- Success: `#2ECC71` | Warning: `#F5A623` | Danger: `#EF4444`
- Cupom/desconto badge: gradient `#25D366` → `#16A34A`

## Layout
- Sidebar fixa à esquerda (ícones + labels): Dashboard, Conectar WhatsApp, Ofertas, Conversor de Link, Configurações.
- Conteúdo em grid denso, cards com borda 1px sutil (`#232A34`), sem sombras pesadas, cantos `rounded-lg` (8px) — nada de cantos muito arredondados (foge do "app fofo").
- Espaçamento generoso entre seções (32px), compacto dentro de cards (12-16px).

## Components
- **Status pill** (conectado/desconectado/aguardando QR) com dot colorido + pulse animation quando "aguardando".
- **Deal card**: imagem do produto à esquerda, título, preço riscado + preço com desconto em destaque (mono), badge de desconto %, badge de cupom se houver, botões Aprovar (verde) / Rejeitar (outline vermelho).
- **Toggle automático/manual** por provedor (Mercado Livre, Amazon, Shopee, Magalu) com logo/cor de cada loja.
- **Provider badges**: Mercado Livre `#FFE600` texto preto, Amazon `#FF9900`, Shopee `#EE4D2D`, Magalu `#0086FF` — usados só em badges pequenos, não dominam a paleta.

## Motion
Fade + slide sutil (150-200ms) ao trocar de página e ao aparecer novos cards de oferta na fila. Sem animação exagerada.

## Anti-patterns a evitar
Gradientes roxos, cards genéricos com sombra pesada, tudo "friendly rounded", emojis em vez de ícones (usar lucide-react).
