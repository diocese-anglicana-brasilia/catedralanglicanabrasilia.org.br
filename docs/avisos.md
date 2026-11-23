# Avisos no site

No CMS, use **Avisos** para criar uma barra no topo ou uma janela modal. Escolha **Publicado** para incluí-lo na próxima compilação do site; rascunhos e avisos desativados não são exibidos. Não existe, nesta etapa, opção de bloquear o site.

Há um aviso de exemplo em rascunho, que não é exibido no site. Ele pode ser editado ou removido pelo CMS.

As datas são opcionais e usam o horário de Brasília. Um aviso publicado com início futuro já precisa estar incluído em uma compilação anterior. Depois disso, a página aberta verifica os horários periodicamente; a exibição também depende do relógio do dispositivo e de JavaScript. Alterações no CMS exigem nova publicação.

Deixe a lista de páginas vazia para exibir no site todo; para restringir, informe caminhos exatos, como `/pages/contact` ou `/news`. A barra e o modal de maior prioridade são escolhidos separadamente; em caso de empate, o identificador do arquivo define a ordem. Se um aviso for fechado, o próximo aviso elegível do mesmo tipo pode aparecer.

As opções de fechamento são: reaparecer ao navegar para outra página, reaparecer na próxima sessão do navegador, reaparecer após o número de dias informado ou não permitir fechamento. Um modal que não pode ser fechado precisa de um botão com destino para que a pessoa possa prosseguir. Informe texto e endereço juntos; use caminho interno iniciado por `/` ou URL HTTPS. A mensagem é texto simples; use o botão para incluir um link.

A escolha de fechamento por sessão ou dias fica armazenada no navegador da pessoa; se o navegador impedir esse armazenamento, o aviso poderá aparecer novamente. O conteúdo do aviso é público, mesmo antes do horário de início: não use este mecanismo para dados confidenciais.
