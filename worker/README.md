# Formulários: Worker e D1

O site continua estático. O Worker recebe contatos em `POST /contact`, verifica o Turnstile no servidor e grava no D1 antes de confirmar o recebimento. O conteúdo não é publicado no Git nem no site. O e-mail imediato contém nome, e-mail, assunto e mensagem completos, enviados ao destinatário configurado. Ainda não existe painel de consulta ou formulário de pedidos de oração.

Os dados de oração e as notificações semanais estão preparados no banco, mas ainda não há endpoint público nem formulário para registrar pedidos. Não use essa parte em produção sem definir a coleta, o aviso de privacidade, as permissões, a retenção e o processo de exclusão.

## Passo a passo: criar o banco e publicar o Worker

Estes comandos são executados na raiz do projeto. Eles criam recursos reais na conta Cloudflare e podem gerar custos conforme o plano e o uso. Confira os limites da sua conta antes de continuar. Não é necessário alterar a hospedagem estática do site.

1. **Autentique o Wrangler.** Com Node.js e npm instalados, execute `npx --yes wrangler login` e autorize a conta correta no navegador. Os comandos abaixo usam a mesma versão do Wrangler; uma versão mais recente pode exigir ajustes. Se a conta ainda não tiver um subdomínio `workers.dev`, a Cloudflare poderá solicitar sua criação durante a publicação.

2. **Crie o banco D1:**

   ```sh
   npx --yes wrangler d1 create catedral-formularios
   ```

   Guarde o `database_id` mostrado no resultado. Se já existir um banco que você queira utilizar, confirme o nome e o identificador na conta antes de prosseguir; não crie outro desnecessariamente.

3. **Prepare a configuração de produção.** Faça uma cópia local de `worker/wrangler.toml` chamada `worker/wrangler.production.toml`. O arquivo de produção está ignorado pelo Git. Nele, substitua o `database_id` fictício pelo identificador recebido no passo anterior e mantenha `database_name` igual ao nome do banco criado. Mantenha `binding = "DB"`, pois é o nome utilizado pelo código. Em `ALLOWED_ORIGINS`, informe as origens do site separadas por vírgula, incluindo protocolo e, se necessário, porta; remova `http://localhost:4321` da produção se não for utilizá-lo. Não acrescente barras ou caminhos às origens. O nome do Worker no arquivo será `catedral-formularios`; altere-o se já houver outro recurso com esse nome.

4. **Crie as tabelas no banco remoto:**

   ```sh
   npx --yes wrangler d1 migrations apply catedral-formularios --remote --config worker/wrangler.production.toml
   ```

   Confira o nome e o identificador exibidos pelo Wrangler antes de confirmar: `--remote` modifica o banco real. Em atualizações futuras, use novamente o comando para aplicar apenas as migrações pendentes; faça backup antes de alterações em produção.

5. **Configure o Turnstile e o Brevo.** No painel Cloudflare, em Turnstile, crie um widget para os domínios nos quais o formulário será usado e anote sua chave pública e sua chave secreta. No Brevo, obtenha uma chave de API e confirme um remetente autorizado. O destinatário será o endereço que recebe os avisos de contato. Não compartilhe chaves secretas em conversas, capturas de tela, issues ou no Git.

6. **Prepare os quatro segredos para a primeira publicação.** Crie, fora do repositório, um arquivo JSON em um diretório privado acessível somente à sua conta. Preencha-o localmente com seus próprios valores:

   ```json
   {
     "TURNSTILE_SECRET": "chave-secreta-do-turnstile",
     "BREVO_API_KEY": "chave-da-api-do-brevo",
     "MAIL_FROM": "remetente-autorizado-no-brevo",
     "MAIL_TO": "endereco-que-recebera-os-avisos"
   }
   ```

   Os valores acima são apenas marcadores, não credenciais válidas. Restrinja as permissões do arquivo, não o coloque em diretório sincronizado ou público e nunca o adicione ao repositório. Guarde os segredos em um gerenciador apropriado e descarte a cópia temporária de forma segura após a publicação.

7. **Publique o Worker e os segredos juntos.** Substitua o caminho abaixo pelo caminho real do arquivo privado, sem colocar os valores dos segredos no comando:

   ```sh
   npx --yes wrangler deploy --config worker/wrangler.production.toml --secrets-file .dev.vars.cf.json
   ```

   Esse comando publica de fato o Worker e seus agendamentos; não é uma simulação. Anote a URL exibida, normalmente terminada em `workers.dev`. Confirme no painel que o Worker está associado ao banco D1 correto e que os agendamentos aparecem. Para atualizar um segredo posteriormente, use o painel da Cloudflare ou `wrangler secret put NOME --config worker/wrangler.production.toml`; esse último cria e publica uma nova versão do Worker.

8. **Ative o formulário no build do site.** Na configuração privada de variáveis do serviço que compila o Astro, defina `PUBLIC_CONTACT_API_URL` com a URL do Worker seguida de `/contact` e `PUBLIC_TURNSTILE_SITE_KEY` com a chave **pública** do widget. Essas duas informações ficam visíveis no site gerado; nunca use a chave secreta do Turnstile nelas. Recompile e publique o site. Para testes locais, essas variáveis também podem ser definidas no arquivo `.env`, que não deve ser versionado.

9. **Proteja e confira a operação.** Configure limitação de requisições e proteção contra abuso na Cloudflare; o Turnstile e o CORS não substituem essas medidas. Envie uma mensagem fictícia pelo formulário publicado, confirme o registro no D1 e o recebimento dos dados completos no e-mail autorizado. Restrinja o acesso ao banco e à caixa de e-mail, defina retenção e exclusão dos dados e configure monitoramento e backups. Não use dados reais no teste inicial.

Referências: [criação de banco D1](https://developers.cloudflare.com/d1/get-started/), [segredos dos Workers](https://developers.cloudflare.com/workers/configuration/secrets/) e [configuração de widgets Turnstile](https://developers.cloudflare.com/turnstile/get-started/widget-management/).

## Segurança e configuração

- `worker/wrangler.toml` é uma configuração local com identificador de banco fictício. Não é uma configuração de produção pronta.
- Copie essa configuração para `worker/wrangler.production.toml` (ignorado pelo Git), defina nela o identificador real do D1 e ajuste `ALLOWED_ORIGINS` aos endereços reais do site. Não publique a configuração local com o ID fictício.
- Configure `TURNSTILE_SECRET`, `BREVO_API_KEY`, `MAIL_FROM` e `MAIL_TO` como segredos do Worker no painel da Cloudflare ou por `wrangler secret put`, sem passá-los como argumentos ou registrá-los no Git. `MAIL_FROM` precisa ser um remetente autorizado pelo Brevo; `MAIL_TO` é o destinatário dos avisos.
- Na compilação do site, `PUBLIC_CONTACT_API_URL` é a URL pública do Worker terminada em `/contact`, e `PUBLIC_TURNSTILE_SITE_KEY` é a chave **pública** do widget. A chave secreta do Turnstile jamais pertence ao frontend. Sem ambas as configurações, o formulário continua desativado.
- O Worker permite apenas origens configuradas, limita o tamanho da requisição e valida o desafio Turnstile. CORS não é autenticação nem limitação de tráfego: configure também proteção contra abuso e limites de requisições na Cloudflare antes de expor o endpoint.
- Os dados completos do contato são transmitidos ao Brevo e à caixa de e-mail configurada, além de armazenados no D1. Restrinja o acesso ao banco e à caixa de e-mail a pessoas autorizadas. Não registre dados pessoais no terminal, nos testes com serviços reais, em issues ou no repositório.
- Defina backups, prazo de retenção, exclusão e aviso de privacidade antes da ativação. Pedidos de oração podem conter dados pessoais sensíveis; o resumo configurado contém o texto completo e será transmitido ao Brevo e à caixa de e-mail.

## Agendamento e falhas

O contato é salvo antes da tentativa de envio e o cron de cinco minutos retenta notificações pendentes. O resumo de oração é preparado aos sábados às 9h no horário de Brasília: os gatilhos das 11h, 12h e 13h UTC são filtrados pelo fuso `America/Sao_Paulo`. O conteúdo do resumo fica fixado no lote; falhas são retomadas pelo cron de cinco minutos. Não é enviado resumo vazio.

As tentativas reduzem perdas, mas não garantem entrega exatamente uma vez: se o Brevo aceitar um e-mail e a confirmação se perder, pode haver duplicação. Uma resposta aceita pela API também não comprova entrega à caixa postal. Monitore falhas e entregas no provedor antes da operação.

## Testes locais

Com Node.js 24 e dependências instaladas:

```sh
node --test tests/worker-contact.test.mjs
npx playwright test tests/contact-submission.spec.ts --workers=1
```

O primeiro teste usa SQLite local em memória e simula serviços externos; o segundo simula a API no navegador. Os testes não enviam e-mail. Para verificar o runtime e as migrações, use o Wrangler com `--local` e um diretório temporário; não use credenciais ou dados reais nos testes. Antes de publicar, valide o ambiente de produção com dados fictícios e um destinatário autorizado.
