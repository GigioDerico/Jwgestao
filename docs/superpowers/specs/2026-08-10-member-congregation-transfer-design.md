# Transferência de membro entre congregações

**Data:** 2026-08-10  
**Status:** desenho aprovado  
**Escopo:** inativação, retirada de designações futuras, bloqueio de acesso e reversão da transferência

## Objetivo

Adicionar à ficha do membro uma ação explícita para registrar sua mudança de congregação. A operação deve tornar o membro inelegível para atividades, retirar suas designações futuras, bloquear seu acesso à congregação atual e preservar o histórico. Uma transferência registrada por engano pode ser cancelada, mas as designações retiradas não são recriadas automaticamente.

## Decisões de produto

- A transferência é iniciada pela ação **Transferir de congregação**, e não apenas pela edição manual da situação espiritual.
- Designações futuras são removidas automaticamente.
- O acesso do membro à congregação é bloqueado.
- A data da transferência é obrigatória e a congregação de destino é opcional.
- O cancelamento restaura o cadastro e o acesso, mas não restaura designações removidas.
- O histórico anterior à transferência é preservado.
- A operação exige conexão com a internet.

## Modelo de dados

### `member_transfers`

Nova tabela de auditoria, com RLS habilitada, contendo:

- `id`: UUID da transferência;
- `member_id`: membro transferido;
- `transferred_at`: data efetiva, obrigatória, igual ou anterior ao dia corrente;
- `destination_congregation`: nome opcional da congregação de destino;
- `previous_spiritual_status`: situação espiritual anterior;
- `previous_group_id`: grupo de serviço anterior, opcional;
- `previous_profile_is_active`: estado anterior do acesso;
- `transferred_by`: usuário responsável;
- `created_at`: instante de criação;
- `cancelled_at`: instante do cancelamento, opcional;
- `cancelled_by`: usuário que cancelou, opcional.

Um índice único parcial impedirá mais de uma transferência não cancelada para o mesmo membro.

### `user_profiles.is_active`

Adicionar `is_active boolean not null default true`. Um perfil inativo não recebe permissões nem acesso aos dados da congregação. A inativação não exclui o usuário ou seu histórico.

### `member_transfer_assignment_audit`

Cada vínculo retirado será registrado como item de auditoria associado à transferência. O registro conterá `transfer_id`, tipo da atividade, tabela e registro de origem, vaga, data da ocorrência, nome exibido e identificador do membro. Isso é necessário especialmente para escalas mensais recorrentes, cujo modelo atual não separa todas as ocorrências por data. O histórico de designações combinará as fontes atuais com esses itens de auditoria para não perder ocorrências já realizadas no mês alterado.

## Arquitetura da operação

A alteração será feita no banco como uma única operação transacional, chamada pela aplicação. A lógica privilegiada ficará fora do schema exposto e será acessada por uma interface RPC controlada. A função validará a permissão do autor e impedirá que ele transfira a si próprio.

### Transferir

Na mesma transação:

1. Validar autor, membro, data e inexistência de transferência ativa.
2. Registrar a transferência e os valores necessários à reversão.
3. Definir `members.spiritual_status` como `inativo` e remover `group_id`.
4. Definir `user_profiles.is_active` como `false`.
5. Localizar e auditar designações agendadas para o dia corrente ou depois dele.
6. Limpar somente as vagas do membro, preservando as atividades e os demais designados.
7. Revogar as notificações futuras vinculadas às vagas removidas.

Se qualquer etapa falhar, toda a transação será revertida.

A data informada registra quando a transferência ocorreu, inclusive quando o lançamento for feito com atraso. A limpeza nunca altera ocorrências anteriores ao dia em que a ação é executada. As escalas com data exata preservarão integralmente os registros passados. Nas escalas mensais recorrentes, o vínculo será retirado da escala vigente e das seguintes; os itens de auditoria e sua integração com o histórico conservarão as ocorrências já realizadas no mês corrente.

### Cancelar transferência

Na mesma transação:

1. Validar a transferência ativa e a permissão do autor.
2. Restaurar a situação espiritual e o grupo anteriores.
3. Restaurar o estado de acesso anterior, que normalmente será ativo.
4. Registrar `cancelled_at` e `cancelled_by`.

As designações removidas permanecem vagas. Os dados de auditoria não são apagados.

## Elegibilidade para atividades

A regra compartilhada de elegibilidade continuará considerando `inativo` e `desassociado` como situações restritas. Todos os seletores de membros serão auditados para usar essa regra, incluindo:

- reuniões do meio e fim de semana;
- partes e orações;
- áudio, vídeo, palco, microfones e indicadores;
- carrinho;
- saídas de campo;
- qualquer sugestão automática ou histórico usado para novas escolhas.

O banco também validará os vínculos novos baseados em `member_id`, recusando um membro inativo. Essa defesa evita novas designações por clientes antigos, listas em cache ou chamadas diretas. Toda nova escolha de um membro interno deverá gravar seu `member_id`; campos textuais legados permanecerão apenas como representação e deverão ficar sincronizados com o ID. Participantes externos, como oradores visitantes, continuam podendo existir somente como texto quando o domínio já prevê essa exceção.

## Controle de acesso

As funções de autorização e as políticas RLS relevantes passarão a exigir `user_profiles.is_active = true`. Isso garante que um token ainda válido não conceda acesso após a transferência.

O contexto de autenticação da aplicação verificará o perfil ativo ao montar ou atualizar a sessão. Ao encontrar um perfil inativo, encerrará a sessão e limpará o perfil local armazenado.

Não é possível apagar remotamente dados que já estejam em um aparelho completamente offline. Esse aparelho poderá visualizar seu cache até se reconectar. Na primeira validação online, a sessão será encerrada e o cache de perfil será removido.

## Interface

Usuários com permissão para editar membros verão **Transferir de congregação** na ficha do membro. A ação não estará disponível para o próprio usuário autenticado nem durante o modo offline.

O diálogo de confirmação exibirá:

- nome do membro;
- data da transferência, preenchida com o dia corrente;
- congregação de destino opcional;
- quantidade de designações futuras que serão removidas;
- aviso sobre bloqueio de acesso e não restauração automática das escalas.

Após concluir, o membro deixará a listagem padrão, mas continuará disponível no filtro **Inativos/Desassociados**. Sua ficha mostrará o marcador **Transferido**, a data, o destino quando informado e a ação **Cancelar transferência**.

Erros serão apresentados sem indicar sucesso parcial, pois a operação de dados é atômica. Após sucesso, os caches de membros, atividades e notificações serão invalidados ou atualizados.

## Segurança e permissões

- Somente usuários autorizados a editar membros podem transferir ou cancelar transferências.
- O autor não pode transferir a si próprio.
- Parâmetros, datas e identidade do autor são validados no servidor.
- A tabela de transferências expõe somente as linhas permitidas pela RLS.
- Funções privilegiadas usam `search_path` fixo e não ficam diretamente no schema exposto.
- A implementação deve revisar todas as políticas que hoje autorizam apenas por `auth.uid()` para que perfis inativos não mantenham acesso a dados pessoais.

## Testes e critérios de aceitação

1. Uma transferência válida grava o histórico, inativa o membro, remove seu grupo, bloqueia o acesso e retira todas as designações futuras.
2. Nenhuma designação passada com data exata é alterada.
3. Falha em qualquer etapa não deixa alteração parcial.
4. O membro transferido não aparece em nenhum seletor ou sugestão de atividade.
5. O banco recusa uma nova designação para membro inativo mesmo com cliente desatualizado.
6. Notificações das vagas removidas ficam revogadas.
7. O membro permanece consultável pelo filtro de registros restritos, com data e destino.
8. Cancelar a transferência restaura situação, grupo e acesso, sem recriar designações.
9. Uma segunda transferência ativa para o mesmo membro é recusada.
10. O usuário não consegue transferir a si próprio.
11. Uma sessão antiga perde autorização no banco e é encerrada pela aplicação ao se reconectar.
12. A ação de transferência não pode ser executada offline nem com data futura.

## Fora de escopo

- Transferir os dados do membro diretamente para outra instância ou congregação do sistema.
- Restaurar automaticamente designações removidas.
- Apagar o membro, suas atividades passadas ou seus registros pessoais.
- Garantir revogação instantânea em um aparelho que permaneça totalmente offline.
