# Publicador: Reunião e respostas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execução recomendada: pelo agente principal nesta sessão, pela dependência entre banco, API e interface; escolha a confirmar na revisão do plano.

**Goal:** Disponibilizar Designações → Reunião para o Publicador consultar reuniões e confirmar ou recusar suas próprias designações, com motivo e acesso direto pelo WhatsApp.

**Architecture:** Reaproveitar `member_assignment_notifications` como estado da resposta, acrescentando versão da atribuição e ocultação independente. Sincronizar designações de reunião no banco e responder por RPC com validação da atribuição atual; servir à interface apenas resumos de reuniões e detalhes pessoais. Preservar os IDs das partes durante edições, reutilizar o contexto de notificações e criar componentes pequenos para a experiência aprovada.

**Tech Stack:** React 18, TypeScript, React Router 7, Tailwind, Radix Dialog, Supabase/PostgreSQL, Vitest/Testing Library, pgTAP e Capacitor existentes.

**Spec:** `docs/superpowers/specs/2026-10-05-publicador-reuniao-design.md`

## Global Constraints

- “A tela mostra somente as designações do usuário.” Não renderizar nem buscar o cronograma completo para esta experiência.
- Uma congregação por instalação; não criar `congregation_id` nem um subsistema de múltiplas congregações.
- Ações: **Confirmar designação**, **Não posso participar**, **Enviar recusa**, **Voltar**.
- Motivo obrigatório, sem aceitar somente espaços, limitado a **500 caracteres** no cliente e no banco.
- Usar **America/Sao_Paulo** para datas e corte do histórico; datas anteriores a hoje são somente consulta.
- Respostas são independentes por membro, origem, função e versão; ocultação não altera resposta.
- Membro recusado permanece atribuído até substituição pelo responsável.
- Coordenador/designador com permissão de gestão consultam recusas; outros membros não veem o motivo.
- Sem novas dependências de produção. Usar tokens e componentes do app, com layout de computador e celular.
- IDs de partes existentes sobrevivem a uma edição sem alterações; links têm versão e exigem login.
- Migration antes da publicação do frontend. Não aplicar alterações em produção durante a escrita ou execução inicial deste plano.

## Review Focus

1. Edição sem mudanças hoje recria partes e destrói a identidade dos links: cobrir salvamento e rollback na tarefa 3.
2. Resposta concorrente com substituição ou reatribuição ao mesmo membro: testar versão e bloqueio na tarefa 2.
3. Notificação `hidden` pode representar confirmação anterior: testar recuperação sem fabricar histórico nas tarefas 1 e 4.
4. Link aberto deslogado, por outra conta ou num app nativo: testar destino, autorização e origem HTTPS na tarefa 7.
5. Horário ausente, meia-noite e falha de rede durante recusa: testar apresentação, corte por data e preservação do texto nas tarefas 4 e 5.

## Evidência e limites do escopo

- `src/app/components/Layout.tsx`: Publicador não recebe o submenu de reuniões; a gestão depende de coordenador/designador.
- `src/app/components/AssignmentsPage.tsx`: bloqueia Publicador e contém a tela administrativa e os quatro pontos atuais de envio de WhatsApp.
- `src/app/lib/api.ts`: confirmação e sincronização são escritas do cliente; `hideAssignmentNotification` grava `hidden`; `updateMidweekMeeting` exclui/recria partes.
- `src/app/components/LoginPage.tsx`: ambos os caminhos de login levam ao Painel.
- `src/app/lib/public-url.ts`: já centraliza `VITE_PUBLIC_APP_URL` e domínio padrão; deve ser reutilizado.
- `src/app/types.ts`: o tipo de status ainda não reconhece `hidden`, embora seja gravado em execução.
- O esquema tem `private.is_active_user()` e `public.has_role_permission(text)`; não tem `congregation_id` nas reuniões.
- A alteração anterior que adiciona **Consideração** em `AssignmentsPage.tsx` pertence a outro pedido e deve ser preservada.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/` — migrations geradas nas tarefas 1–3 | Campos, RPCs, permissões, sincronização e edição atômica |
| `supabase/tests/database/meeting_assignment_responses.test.sql` | Respostas, privacidade, versões e sincronização |
| `supabase/tests/database/meeting_program_updates.test.sql` | IDs estáveis, exclusão seletiva e rollback |
| `src/app/lib/meeting-assignments.ts` | Contratos, leitura e resposta da nova experiência |
| `src/app/lib/meeting-assignment-links.ts` | Rota pessoal e link público com versão |
| `src/app/lib/auth-return-path.ts` | Validação do destino após login |
| `src/app/lib/api.ts`, `src/app/lib/supabase-types.ts`, `src/app/types.ts` | Adaptar pontos existentes e tipos |
| `src/app/components/MeetingAssignmentsRoute.tsx` | Selecionar experiência pessoal ou administrativa |
| `src/app/components/meeting-assignments/PublisherMeetingsPage.tsx` | Lista, histórico, seleção e carregamento |
| `src/app/components/meeting-assignments/MeetingAssignmentCard.tsx` | Detalhes e resposta pessoal |
| `src/app/components/meeting-assignments/DeclineAssignmentDialog.tsx` | Motivo obrigatório e tratamento de falha |
| `src/app/components/meeting-assignments/AssignmentResponseBadge.tsx` | Status compartilhado e motivo administrativo |
| `src/app/context/NotificationsContext.tsx`, `src/app/components/Dashboard.tsx`, `src/app/components/Layout.tsx` | Consistência de respostas e navegação |
| `src/app/components/AssignmentsPage.tsx`, `src/app/components/LoginPage.tsx`, `src/app/lib/whatsapp.ts`, `src/app/lib/public-url.ts`, `src/app/routes.ts` | Integrações com gestão, login e WhatsApp |
| `docs/user-guide.md` | Instruções do novo fluxo |

## Contratos compartilhados

Definir em `meeting-assignments.ts`; os dados de retorno das RPCs devem ser mapeados de snake_case para estes contratos. IDs e versões são strings UUID.

```ts
type MeetingKind = 'midweek' | 'weekend';
type MeetingSourceType = 'midweek_meeting_role' | 'midweek_ministry_part'
  | 'midweek_christian_life_part' | 'weekend_meeting_role';
type MeetingResponseStatus = 'pending_confirmation' | 'confirmed' | 'declined' | 'revoked';
type AssignmentRef = { sourceType: MeetingSourceType; sourceId: string; slotKey: string; memberId: string };
type MeetingSummary = {
  id: string; kind: MeetingKind; date: string; startTime: string | null;
  assignmentCount: number; pendingCount: number;
};
type PersonalMeetingAssignment = {
  notification: AssignmentNotification | null; revision: string | null;
  meetingId: string; meetingKind: MeetingKind; date: string;
  roleLabel: string; title: string; partNumber: number | null;
  time: string | null; duration: number | null; location: string | null;
  partnerName: string | null; canRespond: boolean;
};
type AssignmentResolution =
  | { kind: 'current'; assignment: PersonalMeetingAssignment }
  | { kind: 'changed'; currentPath: string }
  | { kind: 'unavailable' };
type MeetingResponseInput = {
  notificationId: string; revision: string;
  decision: 'confirmed' | 'declined'; reason?: string;
};
```

Estender `AssignmentNotification` com `declined`, `hiddenAt?: string | null`, `declineReason?: string | null`, `respondedAt?: string | null`, `assignmentRevision?: string | null`. Categorias fora das reuniões não precisam de versão nesta entrega. `notification` e `revision` são null somente em registros históricos sem notificação; nesse caso `canRespond` é false e o componente exibe **Sem resposta registrada**.

### Task 1: Persistência, permissões e operação de resposta

**Files:** criar migration pelo CLI `meeting_assignment_responses`; criar `supabase/tests/database/meeting_assignment_responses.test.sql`; atualizar `src/app/lib/supabase-types.ts` após migrations.

**Interfaces:** produzir `public.respond_to_meeting_assignment(p_notification_id uuid, p_revision uuid, p_decision text, p_reason text default null) returns jsonb`, retornando a notificação atualizada. Criar `private.resolve_meeting_assignment(p_source_type text, p_source_id uuid, p_slot_key text) returns jsonb` com atribuição atual normalizada (membro, reunião, data e campos pessoais do contrato). Origem/função inválida retorna null; usar lista explícita de tabelas e colunas permitidas.

- [ ] Escrever casos pgTAP de confirmação própria, recusa vazia/branca, 500/501 caracteres, outra conta, membro transferido/inativo, função não atribuída, data passada e proteção dos campos de origem contra UPDATE direto. Usar fixtures e autenticação simulada do teste de transferência existente.
- [ ] Descobrir CLI com `supabase --help` e ajuda dos subcomandos necessários; consultar documentação atual de RPC/RLS e changelog conforme skill Supabase. Rodar `npm run test:db -- supabase/tests/database/meeting_assignment_responses.test.sql` em banco local e confirmar as falhas pelas funções/colunas ainda ausentes.
- [ ] Gerar migration com `supabase migration new meeting_assignment_responses`. Acrescentar à notificação `hidden_at timestamptz`, `decline_reason text`, `responded_at timestamptz`, `assignment_revision uuid`, `assignment_snapshot jsonb`; constraints de recusa/motivo e estado coerente para registros de reunião.
- [ ] Migrar `hidden` para `hidden_at`: restaurar `confirmed` quando existe `confirmed_at`, senão `pending_confirmation`, respeitando revogações comprovadas pela atribuição atual. Fazer a separação de ocultação em todas as categorias, pois a operação existente é compartilhada. Recuperar data conhecida de confirmação; não preencher uma resposta que nunca foi registrada.
- [ ] Implementar resolver para os slots já enumerados nos quatro métodos `sync*Meeting/PartNotifications` de `api.ts`. Desconsiderar slots suspensos em visita do superintendente como faz a implementação atual. Resolver parceiro somente da própria parte; campos inexistentes ficam null. Para horário, usar valor salvo ou configuração explícita aplicável, nunca constante inventada.
- [ ] Implementar RPC pública `security invoker` chamando função privada `security definer` com `search_path` fixo. Validar sessão ativa, permissão de visualizar designações e identidade do membro; bloquear reunião pai antes de notificação, reler atribuição, comparar versão e usar data do servidor em `America/Sao_Paulo`. Permitir apenas pendente → confirmada/recusada. Repetição da mesma decisão e motivo para a mesma versão retorna o resultado atual; decisão diferente retorna conflito.
- [ ] Proteger campos de atribuição/resposta de reunião contra escrita direta por clientes, inclusive clientes administrativos; permitir metadados próprios de leitura/ocultação. RLS de leitura de notificações de reunião: próprio membro ou coordenador/designador ativo com `can_view_assignments`; não conceder leitura de motivos a secretário por sua regra administrativa legada. Ajustar políticas permissivas existentes, pois adicionar outra não restringe as anteriores. Funções privadas internas sem EXECUTE público; wrappers expostos apenas a `authenticated` com autorização verificada dentro da função.
- [ ] Aplicar localmente, repetir o comando pgTAP até passar e registrar commit contendo somente esta tarefa. Não executar SQL no banco remoto.

### Task 2: Sincronização transacional e versões confiáveis

**Files:** criar migration `meeting_assignment_sync`; ampliar `supabase/tests/database/meeting_assignment_responses.test.sql`.

**Interfaces:** consumir o resolver da tarefa 1. Produzir `private.sync_meeting_assignment_notifications(p_kind text, p_meeting_id uuid) returns void`, exclusiva de triggers/backfill, e versão UUID nova para cada alteração relevante. `assignment_snapshot` guarda campos pessoais normalizados e IDs de participantes envolvidos; mudanças de nomes de exibição isoladas não pedem resposta nova.

- [ ] Escrever pgTAP para inserção sem chamada do frontend, estudante/ajudante com respostas independentes, edição sem alteração, mudança de duração/sala/parceiro, parte removida, troca A→B→A, mudança em outra parte e reunião passada. Assertivas: UUID preservado sem alteração; novo UUID e resposta pendente quando relevante; resposta de parte não afetada preservada; nenhuma nova pendência histórica.
- [ ] Rodar o teste para registrar as falhas e gerar a migration com `supabase migration new meeting_assignment_sync`.
- [ ] Implementar sincronização no banco para INSERT/UPDATE/DELETE nas quatro fontes de reunião e alterações das configurações de horário aplicáveis. Atribuições vigentes são comparadas por conteúdo normalizado, não pelo texto da notificação. Reusar a chave única existente por membro/origem/função; renovar UUID quando uma atribuição revogada volta, mesmo com conteúdo igual.
- [ ] Preservar estado e motivo em atualizações sem mudança; limpar resposta/ocultação e renovar versão em mudança relevante futura. Excluir parte ou retirar membro revoga atribuição. Passagem do tempo por si só não revoga nem apaga resposta. Guardar snapshot para leitura histórica; não oferecer resposta a uma parte removida.
- [ ] Backfill das atribuições existentes: criar notificações ausentes para reuniões atuais/futuras, associar snapshot/versão às existentes e preservar evidência válida de resposta. Para reuniões passadas sem registro, retornar “Sem resposta registrada” na leitura, sem criar notificações pendentes. Não reativar vínculo antigo cujo membro já foi substituído.
- [ ] Testar resposta com versão antiga após substituição e reatribuição, e concorrência em duas conexões locais (responder versus editar). Ambas as operações bloqueiam reunião pai antes de alterar resposta/partes; resultado final nunca confirma a versão nova com o pedido antigo. Repetir pgTAP e registrar commit da tarefa.

### Task 3: Edição de reunião com IDs estáveis

**Files:** criar migration `update_midweek_program`; criar `supabase/tests/database/meeting_program_updates.test.sql` e `src/app/lib/api.meeting-update.test.ts`; modificar `src/app/lib/api.ts` e `src/app/components/AssignmentsPage.tsx`.

**Interfaces:** produzir `public.update_midweek_program(p_meeting_id uuid, p_input jsonb) returns uuid`. O JSON usa os campos snake_case de `CreateMidweekMeetingInput`, com `id?: string` nas duas coleções de partes. A API existente `updateMidweekMeeting(meetingId, input)` mantém seu retorno atual para os consumidores.

- [ ] Escrever testes: salvar sem alterações preserva IDs e versões; reordenar mantém IDs mas atualiza números; adicionar cria somente a nova parte; remover exclui somente a ausente; ID de outra reunião é rejeitado; falha em qualquer parte reverte a edição inteira.
- [ ] Rodar `npm run test:run -- src/app/lib/api.meeting-update.test.ts` e `npm run test:db -- supabase/tests/database/meeting_program_updates.test.sql`, registrando as falhas esperadas.
- [ ] Acrescentar IDs opcionais em `CreateMidweekMeetingInput` e nos drafts/formulários. Levar ID do carregamento ao payload; nunca usar posição do array como identidade.
- [ ] Gerar migration com `supabase migration new update_midweek_program`. Implementar RPC autorizada para coordenador/designador com permissão de edição, com lista de campos permitidos correspondente ao método atual. Chamar `private.lock_meeting_assignment_scope()` antes de escrever cabeçalho/partes, seguindo a ordem global midweek UUID e depois weekend UUID usada pelos gatilhos. Atualizar cabeçalho e partes existentes, inserir partes novas e excluir apenas removidas numa transação. Não aceitar outro `meeting_id` nem IDs pertencentes a outra reunião.
- [ ] Trocar o corpo de `api.updateMidweekMeeting` pela RPC e recarga do resultado. Criar wrapper administrativo `public.reconcile_meeting_assignment_notifications(p_kind text, p_meeting_id uuid) returns void`, autorizado para coordenador/designador com permissão de edição, sobre a função da tarefa 2. Encaminhar métodos de sincronização de reunião antigos para esse wrapper, resolvendo o pai quando o argumento for ID de parte, sem upsert de estados pelo cliente. Isso permite manter os chamadores de criação e edição pontual, que passam a ser idempotentes. Não alterar sincronização de áudio/vídeo, campo e carrinho.
- [ ] Repetir testes, verificar salvamento de uma parte “Consideração” e registrar commit da tarefa.

### Task 4: Leitura pessoal e consistência das notificações

**Files:** criar `src/app/lib/meeting-assignments.ts`, `src/app/lib/meeting-assignments.test.ts`; acrescentar RPCs à migration de leitura criada via `supabase migration new personal_meeting_assignments`; modificar `src/app/types.ts`, `src/app/lib/api.ts`, `src/app/context/NotificationsContext.tsx`; criar `src/app/context/NotificationsContext.responses.test.tsx`.

**Interfaces:** `getPersonalMeetings(period: 'upcoming' | 'past'): Promise<MeetingSummary[]>`; `getPersonalMeetingAssignments(kind: MeetingKind, meetingId: string): Promise<PersonalMeetingAssignment[]>`; `resolvePersonalAssignment(notificationId: string, revision: string): Promise<AssignmentResolution>`; `respondToMeetingAssignment(input: MeetingResponseInput): Promise<AssignmentNotification>`. RPCs correspondentes: `get_personal_meetings(p_period text)`, `get_personal_meeting_assignments(p_kind text,p_meeting_id uuid)`, `resolve_personal_assignment(p_notification_id uuid,p_revision uuid)`, todas retornando JSONB.

- [ ] Escrever testes de reuniões sem designação, duas funções próprias, ajudante, reunião passada sem resposta, notificação oculta confirmada, slot sem notificação antiga, campos ausentes null e limites de data ao redor de meia-noite no fuso definido. Garantir que a resposta de leitura não contenha outros designados, telefones ou motivos alheios.
- [ ] Rodar `npm run test:run -- src/app/lib/meeting-assignments.test.ts src/app/context/NotificationsContext.responses.test.tsx` e testes pgTAP ampliados antes da implementação.
- [ ] Implementar RPCs autenticadas com vínculo ativo e permissões; listagem retorna todas as reuniões da instalação autorizada, com contagens pessoais. Detalhe usa atribuições reais/snapshot e resposta registrada. Designação passada sem notificação produz estado de exibição sem resposta, `notification: null`, `revision: null`, `canRespond: false`. Resolver por ID alheio retorna `unavailable`; somente destinatário vê `changed/currentPath`. Uma notificação de link resolvida como atual deve ter o ID/versão presentes; validar no adaptador antes de construir uma resposta.
- [ ] Implementar camada TypeScript com contratos acima, resolução de data por fuso e mapeamento explícito. Leitura e resposta não usam cache offline como prova da atribuição atual. Expor no contexto `respondToMeetingAssignment(input)` e atualizar notificações após sucesso, retornando o registro salvo.
- [ ] Atualizar `hideAssignmentNotification` para gravar `hidden_at`; preservar status no mapper e em `preserveNotificationState` para categorias legadas. Ao confirmar uma notificação de reunião pelo contexto, exigir a versão carregada e chamar a nova RPC; manter confirmação das outras categorias. Incluir motivo/data/versão no mapper e tipos de Supabase.
- [ ] Contagem de pendências de reunião exclui datas passadas e revogadas; ocultação afeta apenas a apresentação compacta. Repetir testes e registrar commit da tarefa.

### Task 5: Experiência aprovada de Reunião

**Files:** criar os quatro componentes em `src/app/components/meeting-assignments/`, `src/app/components/MeetingAssignmentsRoute.tsx`, `src/app/components/meeting-assignments/PublisherMeetingsPage.test.tsx`, `src/app/components/meeting-assignments/DeclineAssignmentDialog.test.tsx`; modificar `src/app/routes.ts` e `src/app/components/Layout.tsx`.

**Interfaces:** `PublisherMeetingsPage()` consome a tarefa 4; `MeetingAssignmentCard({ assignment, onRespond })`; `DeclineAssignmentDialog({ open, assignment, onOpenChange, onSubmit })`, com `onSubmit(reason: string): Promise<void>`; `AssignmentResponseBadge({ status, reason? })` não decide permissão por conta própria — o chamador só passa motivo autorizado.

- [ ] Escrever testes de menu para Publicador sem privilégios de áudio/carrinho, reuniões sem partes próprias, duas respostas independentes, ausência do cronograma, histórico, falha de carregamento e nova tentativa. No diálogo: motivo branco/501 caracteres inválido, 500 válido, falha preserva texto, duplo clique bloqueado, Escape/Voltar não envia e foco retorna ao acionador.
- [ ] Rodar `npm run test:run -- src/app/components/meeting-assignments` e confirmar as falhas iniciais.
- [ ] Implementar tela seguindo `docs/superpowers/prototypes/2026-10-05-publicador-reuniao.html`: duas colunas no computador, lista/detalhe no celular, abas Próximas reuniões/Histórico, contador de pendências e estado vazio. Renderizar só dados pessoais; horários desconhecidos ficam “Não informado”. Sem conta vinculada a membro, mostrar orientação para contatar o responsável.
- [ ] Implementar confirmação e diálogo com componentes Radix existentes. Atualizar status somente depois de salvar; recarregar detalhe e contagens; em conflito informar alteração e recarregar antes de permitir outra resposta. Calendário só aparece com notificação confirmada, usando `AssignmentCalendarActions` e seu tratamento atual de horário ausente/passado.
- [ ] Adicionar `Designações → Reunião` para Publicador com `view_assignments`. A rota `/assignments/meetings` usa `MeetingAssignmentsRoute`: Publicador vê experiência pessoal; coordenador/designador continuam na gestão. Uma rota de detalhe pessoal `/assignments/meetings/respond/:notificationId` fica disponível a qualquer perfil destinatário autorizado; sua resolução é concluída na tarefa 7.
- [ ] Repetir testes, conferir teclado e tamanhos 390px/1280px, e registrar commit da tarefa.

### Task 6: Acompanhamento do responsável e respostas no Painel

**Files:** modificar `src/app/components/AssignmentsPage.tsx`, `src/app/components/Dashboard.tsx`, `src/app/components/Layout.tsx`; criar `src/app/components/meeting-assignments/AssignmentResponseBadge.test.tsx` e `src/app/components/Dashboard.responses.test.tsx`; ampliar `src/app/lib/meeting-assignments.ts`; criar migration com `supabase migration new meeting_assignment_management_read` para a RPC administrativa.

**Interfaces:** `getMeetingAssignmentResponses(kind: MeetingKind, meetingId: string): Promise<AssignmentNotification[]>` consome uma RPC de leitura administrativa `get_meeting_assignment_responses(p_kind text,p_meeting_id uuid) returns jsonb` com autorização de coordenador/designador e permissão de visualização. Relacionar pela chave completa membro/origem/função.

- [ ] Escrever testes de recusa visível ao gestor, motivo ausente para outra conta, estado separado para estudante/ajudante, preservação do nome recusado e Painel/sino sem ícone ou calendário de confirmação para recusas.
- [ ] Rodar testes novos e testes existentes de calendário; implementar RPC, leitura e indicadores junto a cada designado. Ler por reunião em lote; atualizar ao receber eventos de notificações e ao voltar o foco à janela, cancelando assinaturas ao trocar reunião.
- [ ] Substituir checks de `status === 'hidden'` por `hiddenAt` no Painel e sino. Para pendências de reunião, disponibilizar acesso ao detalhe de resposta; confirmação rápida existente deve usar RPC com versão. Recusas têm indicação textual e não contam como pendentes; histórico não apresenta ação de responder.
- [ ] Repetir `npm run test:run -- src/app/components/Dashboard.responses.test.tsx src/app/components/meeting-assignments/AssignmentResponseBadge.test.tsx src/app/components/AssignmentCalendarActions.test.tsx` e registrar commit da tarefa.

### Task 7: WhatsApp e destino após login

**Files:** criar `src/app/lib/meeting-assignment-links.ts`, `src/app/lib/auth-return-path.ts` e seus testes; modificar `src/app/lib/whatsapp.ts`, `src/app/lib/public-url.ts`, `src/app/components/LoginPage.tsx`, `src/app/components/Layout.tsx`, `src/app/components/AssignmentsPage.tsx`, `src/app/components/MeetingAssignmentsRoute.tsx`; criar `src/app/lib/whatsapp.test.ts`, `src/app/components/LoginPage.return-path.test.tsx`.

**Interfaces:** `buildMeetingAssignmentPath(notificationId: string, revision: string): string` → `/assignments/meetings/respond/{id}?revision={uuid}`; `buildMeetingAssignmentUrl(...)` usa `buildPublicAppUrl`; `getSafeReturnPath(value: unknown): string` retorna rota interna validada ou `/dashboard`. Acrescentar `assignmentUrl?: string` a `DesignationMessageData`; origem/vínculo da notificação são resolvidos pela gestão antes do envio.

- [ ] Escrever testes de URL/UUID, origem HTTPS em produção/Capacitor, mensagem com link nos dois modos de envio, nenhuma confirmação disparada ao abrir link, login com retorno, usuário já autenticado, query perdida, `//evil`, URLs externas, barras invertidas e valores codificados de redirecionamento.
- [ ] Rodar `npm run test:run -- src/app/lib/meeting-assignment-links.test.ts src/app/lib/auth-return-path.test.ts src/app/lib/whatsapp.test.ts src/app/components/LoginPage.return-path.test.tsx` para registrar falhas.
- [ ] Montar URL com ID e versão atuais obtidos da leitura administrativa da tarefa 6. Acrescentar ao texto compartilhado “Confira os detalhes e confirme sua participação ou informe se não puder participar:” seguido do link. Os quatro pontos atuais de envio (leitura bíblica, estudante, presidente de fim de semana e leitor da Sentinela) passam referência exata; incluir ação individual para ajudante nos mesmos controles da parte para enviar seu próprio link, sem compartilhar o link do estudante.
- [ ] Se não houver notificação vinculada para um destinatário interno, reconciliar no banco e reler; se continuar ausente, informar erro e não enviar uma mensagem supostamente confirmável. Nomes externos sem membro mantêm mensagem informativa sem promessa de confirmação.
- [ ] Preservar caminho e query em `returnTo` ao redirecionar para login; usar validador nos dois caminhos de sucesso de `LoginPage`. Permitir apenas caminhos internos reconhecidos, preservando o link de designação; não navegar a um destino externo. `getPublicAppOrigin` usa configuração válida HTTPS/domínio padrão em produção e no Capacitor; desenvolvimento web pode usar origem local.
- [ ] Implementar resolução da rota pessoal: `current` abre reunião, seleciona e focaliza a parte; `changed` informa alteração e oferece novo destino; `unavailable` dá mensagem genérica e volta à lista. Sem versão na URL, pedir acesso à lista em vez de assumir versão atual. Login por outro membro não revela reunião, motivo ou nome do destinatário pelo link.
- [ ] Repetir testes e ensaiar o fluxo web/WhatsApp em celular; abrir no navegador é suficiente, associação nativa de domínio ao app fica fora desta entrega. Registrar commit da tarefa.

### Task 8: Integração, documentação e preparação da publicação

**Files:** atualizar `docs/user-guide.md`, este plano e os tipos gerados de Supabase; ajustes nos testes das tarefas anteriores conforme necessário.

- [ ] Rodar todos os novos testes focados, `npm run test:run`, `npm run test:db` no banco local e `npm run build`. Registrar comandos/resultados e distinguir falhas anteriores de regressões; não afirmar aprovação de verificação indisponível.
- [ ] Ensaiar com duas contas Publicador e uma de gestor: listar reuniões; confirmar; recusar com motivo; consultar motivo pelo gestor; substituir; voltar ao link antigo; confirmar múltiplas funções; ocultar notificação; editar reunião sem mudanças; consultar histórico e voltar do login para uma parte.
- [ ] Validar desktop/celular, estados de erro e acessibilidade básica. Conferir que a interface não contém cronograma nem expõe motivos de outras pessoas. Conferir Áudio e Vídeo/campo/carrinho após migração de `hidden`.
- [ ] Revisar políticas efetivas e grants no banco local; executar verificação de advisors conforme ferramentas disponíveis e revisar warnings relevantes. Atualizar documentação com recusa, links e comportamento de substituição.
- [ ] Preparar publicação: migrations e backfill antes do frontend; clientes antigos que tentarem editar diretamente respostas de reunião recebem erro e devem atualizar. Orientar recarga/atualização do app. Se publicação do frontend falhar, manter schema aditivo e corrigir adiante, sem apagar motivos ou versões.
- [ ] Registrar commit final e apresentar resultado verificável. Aplicação remota e publicação são etapas posteriores, mediante autorização correspondente.

## Auto-revisão do plano

- Cobertura: navegação/UI → tarefa 5; persistência/permissões → 1; versões/histórico → 2; links estáveis → 3; leitura/ocultação → 4; gestão/Painel → 6; WhatsApp/login → 7; integração/publicação → 8.
- Dependências: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. As interfaces são compartilhadas; execução sequencial reduz divergências de contrato.
- Antes de codificar, ler spec e plano juntos. Revalidar schema efetivo local e políticas posteriores às migrations de referência. Documentar qualquer divergência material encontrada sem ampliar o escopo automaticamente.
