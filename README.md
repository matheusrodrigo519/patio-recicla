# Pátio — Gestão de recicláveis

Interface publicada no GitHub Pages. Entradas, saídas, estoque, cargas e resultado econômico em áreas separadas.

## Desenvolvimento

Use Node.js 22.13 ou superior. Execute `npm install` e `npm run build`. O build gera `docs/`. Publique main /docs em Settings → Pages.

## Arquitetura

GitHub Pages hospeda a interface. O servidor de autenticação e banco D1 continua no ambiente original, configurado em `lib/client-api.ts`. O sistema precisa desse servidor para operar; não usa estoque local fictício.

As rotas em `app/api`, as funções de autenticação e as migrações documentam o backend atualmente publicado em Cloudflare Workers/Sites; não são executadas por GitHub Pages.

A senha nunca fica neste repositório. No servidor, configure PATIO_PASSWORD_HASH e PATIO_PASSWORD_SALT como segredos. Sessões expiram em oito horas e são revogadas ao sair. A interface guarda somente o token de sessão na aba, descartado ao fechar a aba ou sair.

Dados de negócio e credenciais não estão incluídos no código.
