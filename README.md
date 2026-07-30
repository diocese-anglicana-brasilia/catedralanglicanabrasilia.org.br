# Catedral Anglicana de Brasília

Site institucional desenvolvido com Astro.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para habilitar o formulário de contato, crie um arquivo `.env` a partir de
`.env.example` e informe a URL do webhook do Flow de contato no Directus:

```bash
cp .env.example .env
```

```env
PUBLIC_CONTACT_ENDPOINT=https://seu-directus/flows/trigger/seu-flow-id
```

No Directus, configure CORS para permitir a origem em que o site será servido.
Durante o desenvolvimento local, inclua `http://localhost:4321`; em produção,
inclua o domínio público do site. Sem isso, o navegador bloqueia o envio mesmo
quando o webhook está funcionando.

## Verificação e publicação local

```bash
npm run check
npm run build
npm run preview
```

## Testes funcionais

Os testes funcionais usam Playwright e são executados em Chromium com dois
perfis: desktop e mobile. Eles cobrem fluxos essenciais, responsividade e uma
auditoria automática de acessibilidade com axe-core. O webhook de contato é
simulado durante esses testes, portanto nenhuma mensagem é enviada ao Directus.

```bash
npm run test:e2e
```

O conteúdo da página inicial está em `src/pages/index.astro`. Os elementos globais ficam em `src/components` e os estilos e comportamentos compartilhados em `src/styles` e `src/scripts`.
