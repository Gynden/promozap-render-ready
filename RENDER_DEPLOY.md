# Deploy do PromoZap no Render

## Variáveis obrigatórias
- WEBSITE_URL=https://SEU-SERVICO.onrender.com
- BETTER_AUTH_SECRET=gerada automaticamente pelo Blueprint
- DATABASE_URL=URL do banco Turso
- DATABASE_AUTH_TOKEN=token do Turso

## Primeiro deploy
1. Suba esta pasta para um repositório GitHub.
2. No Render, escolha New > Blueprint.
3. Conecte o repositório.
4. Informe as variáveis solicitadas.
5. Depois do deploy, abra o Shell e execute uma vez:
   bun run db:push

## Persistência do WhatsApp
No plano gratuito, arquivos locais podem sumir após reinício/deploy.
Para manter a sessão do WhatsApp, use um serviço pago com Persistent Disk montado em:
/app/packages/web/.data

Depois, mantenha:
WA_AUTH_DIR=/app/packages/web/.data/wa-auth
