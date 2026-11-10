# Catedral Anglicana de Brasília

Site institucional desenvolvido com Astro.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para configurar o endereço público do site, crie um arquivo `.env` a partir de
`.env.example`:

```bash
cp .env.example .env
```

```env
PUBLIC_SITE_URL=https://catedralanglicanabrasilia.org.br
```

O formulário de contato está temporariamente indisponível, sem integração de
envio. Enquanto isso, visitantes podem entrar em contato pelo e-mail informado
na página.

## Verificação e publicação local

```bash
npm run check
npm run build
npm run preview
```

## Testes funcionais

Os testes funcionais usam Playwright e são executados em Chromium com dois
perfis: desktop e mobile. Eles cobrem fluxos essenciais, responsividade e uma
auditoria automática de acessibilidade com axe-core.

```bash
npm run test:e2e
```

O conteúdo da página inicial está em `src/pages/index.astro`. Os elementos globais ficam em `src/components` e os estilos e comportamentos compartilhados em `src/styles` e `src/scripts`.

`PUBLIC_SITE_URL` define a URL canônica usada pelos metadados de SEO e pelas
prévias em redes sociais. Caso o domínio público mude, atualize também as URLs
em `public/robots.txt` e `public/sitemap.xml`.
