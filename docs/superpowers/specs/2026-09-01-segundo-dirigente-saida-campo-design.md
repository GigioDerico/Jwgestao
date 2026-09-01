# Segundo dirigente na saída de campo

**Data:** 2026-09-01
**Status:** Aprovado

## Problema

A escala de saída de campo permite apenas um responsável por linha. Na prática, alguns dias contam com dois dirigentes que se revezam. Hoje o encarregado precisa escolher um nome só, ou digitar os dois manualmente num campo de texto que também alimenta o vínculo com o cadastro de membros — o que quebra o histórico de designações e as notificações.

## Objetivo

Permitir registrar um segundo dirigente (opcional) nas linhas de saída de campo, com o mesmo vínculo a `members` que o primeiro já tem, preservando histórico, notificações e validação de elegibilidade.

## Escopo

**Categorias afetadas:** Segunda-feira, Terça-feira, Quarta-feira, Sexta-feira, Sábado e Sábado - Rural.

**Fora do escopo:** Domingo. Essa categoria é organizada por grupo de serviço (o campo `responsible` guarda o nome do grupo, não de uma pessoa) e não tem coluna "Responsável" na tabela.

**Não há revezamento automático.** O sistema não decide qual dos dois dirigentes atua em cada semana. Ambos os nomes ficam registrados e visíveis; a alternância é combinada fora do sistema.

O segundo dirigente é sempre opcional — toda linha continua válida com um único responsável.

## Estado atual

`public.field_service_assignments` tem um único par de colunas para o responsável:

```sql
responsible VARCHAR(255) NOT NULL,           -- texto livre; aceita "A definir",
                                             -- "Irmãs Pioneiras", "Superintendente"
responsible_member_id UUID REFERENCES public.members(id)  -- nullable
```

O par texto + FK existe porque nem todo responsável é um membro cadastrado: as opções fixas `Irmãs Pioneiras` e `Superintendente` e o placeholder `A definir` gravam só o texto, com `responsible_member_id` nulo.

Consumidores desse par:

| Local | Uso |
|---|---|
| `private.reject_ineligible_assignment` (trigger) | Rejeita insert/update com membro inelegível. Recebe nomes de coluna variádicos. |
| `api.syncFieldServiceAssignmentNotifications` | Cria notificação para o membro, no slot `responsible`. |
| `api.getDesignationHistory` | Emite uma entrada de histórico com `roleKey: 'responsible'`. |
| `mapFieldServiceAssignment` | Converte row → `FieldServiceAssignment`. |
| `FieldServiceAssignments.tsx` | Renderiza e edita a célula "Responsável". |

`cart_assignments` já resolve exatamente esse problema com `publisher1`/`publisher2` (+ os respectivos `_member_id`). O design abaixo replica esse padrão.

## Design

### Banco

Nova migration adiciona duas colunas nullable:

```sql
ALTER TABLE public.field_service_assignments
  ADD COLUMN IF NOT EXISTS responsible_2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsible_2_member_id UUID REFERENCES public.members(id);
```

`responsible_2` é nullable (diferente de `responsible`, que é `NOT NULL`): nulo significa "sem segundo dirigente". Nenhum backfill é necessário — as linhas existentes já representam o caso de um responsável só.

O trigger de elegibilidade passa a cobrir a nova coluna, seguindo a forma já usada em `cart_assignments`:

```sql
drop trigger if exists reject_ineligible_field_service_assignments
  on public.field_service_assignments;
create trigger reject_ineligible_field_service_assignments
before insert or update on public.field_service_assignments
for each row execute function private.reject_ineligible_assignment(
  'responsible_member_id',
  'responsible_2_member_id'
);
```

As políticas RLS existentes cobrem a tabela inteira e não precisam mudar.

### Tipos e API

`FieldServiceAssignment` (`src/app/types.ts`) e `CreateFieldServiceAssignmentInput` (`src/app/lib/api.ts`) ganham os campos correspondentes, opcionais. `mapFieldServiceAssignment` passa a expor `responsible2` e `responsible2MemberId`, normalizando ausência para `null`. Os tipos gerados em `src/app/types/supabase.ts` são atualizados junto.

`updateFieldServiceAssignment` já aceita `Partial<CreateFieldServiceAssignmentInput>`, então gravar e limpar o segundo dirigente usa o caminho existente sem mudança de assinatura.

`ensureFieldServiceAssignmentsForMonth` não muda: as linhas geradas continuam nascendo com um responsável (`A definir`) e o segundo campo vazio. A lógica de deduplicação por categoria/weekday permanece intacta — continua sendo **uma linha por dia**, não uma linha por dirigente.

### Notificações

`syncFieldServiceAssignmentNotifications` passa a fazer um segundo `upsertAssignmentNotificationSlot` com `slotKey: 'responsible_2'`, espelhando o primeiro.

A chamada é incondicional. `upsertAssignmentNotificationSlot` já trata `memberId` nulo revogando qualquer notificação existente naquele slot — que é justamente o comportamento necessário quando um segundo dirigente é removido de uma linha. Colocar uma guarda de "só notifica se houver membro" deixaria a notificação anterior ativa após a remoção.

A mensagem do segundo slot usa o mesmo texto do primeiro — ambos são dirigentes com o mesmo papel, e distinguir "primeiro" de "segundo" na notificação não teria significado para quem recebe.

### Histórico

`getDesignationHistory` inclui as duas colunas no `select` e emite uma segunda entrada com `roleKey: 'responsible_2'` e o mesmo `roleLabel: 'Responsável'`. `addEntry` já descarta nomes vazios e `A definir`, então linhas sem segundo dirigente não poluem o histórico.

Usar o mesmo `roleLabel` mantém a contagem de designações por membro correta: quem foi designado como segundo dirigente aparece com o mesmo peso de quem foi o primeiro.

### Interface

Na célula "Responsável" de `FieldServiceAssignments.tsx` (tabela desktop e cards mobile):

- Com um dirigente: comportamento atual, mais uma ação discreta **"+ 2º dirigente"** abaixo do nome.
- Com dois dirigentes: os nomes aparecem como `Nome 1 / Nome 2`, cada um clicável para edição independente.

`MemberSelectModal` é reaproveitado. O estado `memberEditModal` passa a carregar qual campo está sendo editado (`'responsible' | 'responsible_2'`), e o modal ganha uma ação **"Remover"** — disponível apenas ao editar o segundo dirigente, para voltar a ter um responsável só. Remover grava `null` nas duas colunas do segundo dirigente.

Para o primeiro responsável, "A definir" continua sendo a forma de esvaziar; ele nunca some, porque a coluna é `NOT NULL`.

As opções fixas `Irmãs Pioneiras` e `Superintendente` continuam disponíveis nos dois campos.

Na exportação (imagem e PDF), a célula renderiza `Nome 1 / Nome 2` quando existem dois, e só `Nome 1` caso contrário. O layout de colunas não muda — o texto concatenado ocupa a mesma célula.

## Tratamento de erros

Erros de gravação continuam passando por `formatDatabaseWriteError` e aparecendo via `toast.error`, como no fluxo atual. O caso novo relevante é o trigger rejeitando um membro inelegível escolhido como segundo dirigente: a mensagem do trigger sobe inalterada até o toast, igual ao que já acontece com o primeiro.

Designar a mesma pessoa nos dois campos não é bloqueado. É um registro sem sentido prático, mas não corrompe nada — geraria duas notificações e duas entradas de histórico para o mesmo membro. Uma validação de UI impede o caso óbvio (o modal do segundo dirigente não oferece quem já está no primeiro), sem constraint no banco.

## Testes

- **Migration:** colunas criadas como nullable; trigger rejeita membro inelegível em `responsible_2_member_id`; linhas pré-existentes continuam válidas com `responsible_2` nulo.
- **API:** `mapFieldServiceAssignment` normaliza ausência para `null`; `updateFieldServiceAssignment` grava e limpa o segundo dirigente; `syncFieldServiceAssignmentNotifications` cria o slot `responsible_2` quando há membro e revoga a notificação daquele slot quando o segundo dirigente é removido; `getDesignationHistory` emite duas entradas quando há dois dirigentes e uma quando há um.
- **UI:** célula mostra um nome, dois nomes separados por `/`, e a ação de adicionar/remover; exportação reflete os dois casos.
