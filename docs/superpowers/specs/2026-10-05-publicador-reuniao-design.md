# Reunião: consulta e resposta do Publicador

## Objetivo e desenho aprovado

Adicionar **Designações → Reunião** ao perfil Publicador para consultar as reuniões cadastradas da sua congregação e responder às próprias designações. O usuário aprovou o protótipo com lista de reuniões, detalhes pessoais, confirmação, recusa com motivo e histórico. Pediu explicitamente retirar o cronograma: a tela mostra somente as designações do usuário.

Protótipo interativo de referência nesta sessão: `/private/tmp/jw-reuniao-preview/index.html`.

## Experiência do Publicador

- Mostrar reuniões de meio de semana e fim de semana em ordem cronológica, com a próxima em destaque.
- Separar próximas reuniões e histórico. O histórico contém reuniões de datas anteriores ao dia atual; respostas são permitidas apenas para reuniões de hoje ou futuras que ainda existam e mantenham o usuário designado.
- Cada reunião mostra data, tipo e indicação de designação pessoal. Havendo várias partes, mostrar quantas aguardam resposta.
- Ao abrir, mostrar data e identificação da reunião e somente as designações do membro associado à conta autenticada.
- Cada designação apresenta função, número e título da parte, horário, duração, local e ajudante, conforme os dados existentes. Não inventar horários ou detalhes ausentes.
- Quando não houver designação pessoal, mostrar “Você não tem designação nesta reunião”.
- No computador, usar lista à esquerda e detalhes à direita; no celular, lista seguida de uma tela de detalhes com ação de voltar.
- Seguir os componentes, cores e tipografia do aplicativo. Status sempre têm texto e ícone, além de cor.
- Oferecer carregamento, mensagem de erro com nova tentativa e estado vazio sem reuniões.

## Respostas

- Cada designação tem resposta independente, inclusive quando o usuário participa de várias partes na mesma reunião.
- Pendente: ações **Confirmar designação** e **Não posso participar**.
- Confirmar salva a resposta e sua data antes de mostrar sucesso. Disponibilizar a integração de calendário existente para a designação confirmada.
- Recusar abre um diálogo com contexto da designação e campo obrigatório “Motivo da recusa”. Rejeitar texto vazio ou composto apenas de espaços; limitar a 500 caracteres.
- Informar no diálogo que o motivo será visível aos responsáveis pelas designações.
- **Voltar** fecha o diálogo sem enviar. **Enviar recusa** salva resposta, motivo e data; só então mostra sucesso.
- Bloquear envios repetidos durante a operação. Em erro, manter o motivo digitado para nova tentativa.
- Após responder, mostrar o status e retirar as ações de resposta daquela versão da designação. Recusa mostra o motivo ao próprio membro.
- A proposta mantém o membro na escala com indicador **Recusado**, até o responsável escolher um substituto; não limpa a atribuição automaticamente.

## Acompanhamento administrativo

- Coordenador e designador visualizam os estados **Aguardando resposta**, **Confirmada** e **Recusada** junto aos designados na tela administrativa existente.
- O motivo de recusa é visível ao membro que respondeu e aos responsáveis autorizados da mesma congregação.
- Ao substituir um designado, a resposta antiga deixa de ser uma resposta ativa e o substituto recebe uma designação pendente.
- Uma alteração relevante no conteúdo, data ou função exige nova resposta. Atualizações sem mudança de conteúdo preservam respostas, incluindo recusa e motivo.
- Não acrescentar envio automático de WhatsApp ao responsável nesta entrega; o acompanhamento ocorre dentro do aplicativo.

## Link no WhatsApp e autenticação

- Mensagens de designação de reunião, tanto por envio integrado quanto pela abertura manual do WhatsApp, incluem link para a designação específica do destinatário.
- Usar URL pública configurada do aplicativo, inclusive quando o envio ocorre pelo app nativo; não gerar links com origem local do Capacitor.
- O link abre a reunião e destaca a designação correspondente.
- Se não estiver autenticado, preservar o destino e voltar à designação após login. Validar o destino como rota interna do aplicativo.
- O link identifica a designação, mas não autoriza leitura nem resposta. A resposta exige a conta do membro designado.
- Link de designação cancelada, substituída ou indisponível apresenta explicação e acesso à lista de reuniões, sem permitir responder à atribuição antiga.
- Usuário autenticado como outro membro recebe mensagem de indisponibilidade sem acesso ao motivo ou aos detalhes pessoais do destinatário.

## Dados e integração

- Reaproveitar `member_assignment_notifications`, que já associa membro, origem e função, e registra confirmação.
- Acrescentar estado de recusa, motivo e data de resposta. Atualizar tipos, leitura e sincronização para preservar esses campos quando a designação não mudou e limpá-los quando exigir nova resposta.
- Conferir a atribuição atual no momento da resposta, sua congregação e a identidade do membro no banco. Uma resposta antiga não pode sobrescrever uma nova atribuição.
- Restringir a operação de resposta aos campos permitidos e às transições válidas. Validar motivo obrigatório também no banco.
- Reuniões vêm das fontes existentes, filtradas pela congregação. Os detalhes pessoais são resolvidos pelas atribuições atuais e suas notificações.
- Reutilizar o contexto de notificações para manter os estados consistentes com o Painel e a lista de notificações. Recusas deixam de contar como pendentes e nunca aparecem como confirmadas.
- Ocultar uma notificação não remove a designação da nova tela. Os dados desta tela não dependem apenas da lista de notificações visíveis.
- Os acessos administrativos existentes continuam usando a tela de gestão; Publicador recebe a experiência aprovada na rota de reuniões de Designações.
- Entregar alterações de banco em migration versionada; a publicação requer aplicação da migration correspondente.

## Critérios de aceite e verificação planejada

1. Publicador encontra o novo menu mesmo sem aprovação para áudio e vídeo ou carrinho.
2. Vê reuniões de sua congregação e somente suas designações dentro dos detalhes.
3. Confirma uma parte sem confirmar outras partes da mesma reunião.
4. Recusa exige motivo, registra resposta e permite ao responsável consultar o motivo.
5. Respostas persistem após recarregar; Painel e notificações mostram o estado correto.
6. Fluxo funciona no computador e no celular, com navegação por teclado e foco adequado no diálogo.
7. WhatsApp inclui link correto nos dois modos de envio; login preserva o destino.
8. Outra conta, designação revogada, reunião passada e atribuição substituída não podem responder pelo destinatário original.
9. Falha de rede não mostra sucesso e não perde o texto de recusa.
10. Atualização sem mudanças preserva resposta; alteração relevante pede nova confirmação.

Verificação: testes focados nas transições e permissões de resposta, sincronização de notificações e links/login; avaliação visual dos estados da tela e do diálogo em computador e celular.
