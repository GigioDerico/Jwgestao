# Segundo Dirigente na Saída de Campo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar um segundo dirigente opcional nas linhas de saída de campo (todas as categorias exceto Domingo), com o mesmo vínculo a `members` que o primeiro já tem.

**Architecture:** Replica o padrão já usado em `cart_assignments` (`publisher1`/`publisher2`): duas novas colunas nullable `responsible_2` e `responsible_2_member_id` em `field_service_assignments`. O trigger de elegibilidade, as notificações, o histórico de designações e a UI passam a tratar o segundo slot em espelho ao primeiro. Nenhum backfill é necessário — nulo significa "sem segundo dirigente".

**Tech Stack:** React 18 + TypeScript, Supabase (Postgres + RLS), Vitest para testes de unidade, pgTAP (`supabase test db`) para testes de schema, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-01-segundo-dirigente-saida-campo-design.md`

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `supabase/migrations/20260901120000_add_field_service_second_responsible.sql` | Colunas novas + trigger de elegibilidade estendido | Criar |
| `supabase/tests/database/field_service_second_responsible.test.sql` | Testes pgTAP do schema e do trigger | Criar |
| `src/app/types.ts` | Tipo `FieldServiceAssignment` | Modificar |
| `src/app/types/supabase.ts` | Tipos gerados da tabela | Modificar |
| `src/app/lib/api.ts` | Input, mapper, notificações, histórico | Modificar |
| `src/app/lib/api.field-service.test.ts` | Testes do mapper, notificações e histórico | Criar |
| `src/app/components/FieldServiceAssignments.tsx` | UI de edição e exportação | Modificar |

Ordem: banco → tipos → API → UI. Cada task deixa o app funcionando.

---

### Task 1: Migration — colunas e trigger

**Files:**
- Create: `supabase/migrations/20260901120000_add_field_service_second_responsible.sql`
- Test: `supabase/tests/database/field_service_second_responsible.test.sql`

- [ ] **Step 1: Escrever o teste pgTAP que falha**

Criar `supabase/tests/database/field_service_second_responsible.test.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select has_column(
  'public',
  'field_service_assignments',
  'responsible_2',
  'field service assignments expose a second responsible name'
);
select col_type_is(
  'public',
  'field_service_assignments',
  'responsible_2',
  'character varying(255)',
  'second responsible name is a varchar(255)'
);
select col_is_null(
  'public',
  'field_service_assignments',
  'responsible_2',
  'second responsible name is optional'
);
select has_column(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'field service assignments expose a second responsible member link'
);
select col_type_is(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'uuid',
  'second responsible member link is a uuid'
);
select col_is_null(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'second responsible member link is optional'
);
select col_is_fk(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'second responsible member link is a foreign key'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test:db`

Expected: FAIL. As asserções de `has_column` para `responsible_2` e `responsible_2_member_id` falham porque as colunas não existem.

Se o Supabase local não estiver rodando, suba antes com `npx supabase start`.

- [ ] **Step 3: Escrever a migration**

Criar `supabase/migrations/20260901120000_add_field_service_second_responsible.sql`:

```sql
-- Segundo dirigente opcional na saída de campo.
-- Espelha o par responsible/responsible_member_id já existente, seguindo o
-- padrão publisher1/publisher2 de cart_assignments.

alter table public.field_service_assignments
  add column if not exists responsible_2 varchar(255),
  add column if not exists responsible_2_member_id uuid references public.members(id);

-- O trigger de elegibilidade recebe nomes de coluna variádicos: basta recriá-lo
-- incluindo a nova coluna para que membros inelegíveis também sejam rejeitados
-- no segundo slot.
drop trigger if exists reject_ineligible_field_service_assignments
  on public.field_service_assignments;
create trigger reject_ineligible_field_service_assignments
before insert or update on public.field_service_assignments
for each row execute function private.reject_ineligible_assignment(
  'responsible_member_id',
  'responsible_2_member_id'
);
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test:db`

Expected: PASS — `field_service_second_responsible.test.sql .. ok`, 7 asserções.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260901120000_add_field_service_second_responsible.sql supabase/tests/database/field_service_second_responsible.test.sql
git commit -m "feat: add second responsible columns to field service assignments"
```

---

### Task 2: Trigger rejeita membro inelegível no segundo slot

Valida que a extensão do trigger da Task 1 realmente cobre a nova coluna, e não só que ela existe.

**Files:**
- Modify: `supabase/tests/database/field_service_second_responsible.test.sql`

- [ ] **Step 1: Adicionar o teste que falha**

No arquivo de teste, trocar `select plan(7);` por `select plan(9);` e inserir, logo antes de `select * from finish();`:

```sql
-- Membro inelegível não pode ser designado como segundo dirigente.
insert into public.members (id, full_name, spiritual_status)
values ('11111111-1111-1111-1111-111111111111', 'Irmão Inativo', 'inativo');

insert into public.members (id, full_name, spiritual_status)
values ('22222222-2222-2222-2222-222222222222', 'Irmão Ativo', 'publicador');

select throws_ok(
  $test$
    insert into public.field_service_assignments
      (month, year, weekday, time, responsible, location, category,
       responsible_2, responsible_2_member_id)
    values
      (9, 2026, 'Segunda-feira', '08:45', 'A definir', 'Salão do Reino',
       'Segunda-feira', 'Irmão Inativo', '11111111-1111-1111-1111-111111111111')
  $test$,
  'second responsible rejects ineligible members'
);

select lives_ok(
  $test$
    insert into public.field_service_assignments
      (month, year, weekday, time, responsible, location, category,
       responsible_2, responsible_2_member_id)
    values
      (9, 2026, 'Terça-feira', '16:30', 'A definir', 'Salão do Reino',
       'Terça-feira', 'Irmão Ativo', '22222222-2222-2222-2222-222222222222')
  $test$,
  'second responsible accepts eligible members'
);
```

Se as colunas de `public.members` usadas acima não baterem com o schema real (por exemplo, se `full_name` ou `spiritual_status` tiverem outro nome ou houver colunas `NOT NULL` adicionais), ajustar os dois `insert into public.members` para satisfazer o schema. Confirmar com:

```bash
grep -n "create table.*public.members" -A 25 supabase/migrations/20260225231935_init_schema.sql
```

- [ ] **Step 2: Rodar e confirmar o resultado**

Run: `npm run test:db`

Expected: PASS nas 9 asserções. A migration da Task 1 já estendeu o trigger, então este teste deve passar de primeira — ele existe para provar que a extensão funciona, não só que as colunas existem.

Se `throws_ok` falhar, o trigger não está cobrindo a nova coluna: revisar o bloco `create trigger` da migration.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/database/field_service_second_responsible.test.sql
git commit -m "test: cover eligibility trigger on second responsible"
```

---

### Task 3: Tipos TypeScript

Mudança de tipos pura, sem comportamento novo — validada pelo compilador, não por teste unitário.

**Files:**
- Modify: `src/app/types.ts:159-167`
- Modify: `src/app/types/supabase.ts:186-232`
- Modify: `src/app/lib/api.ts:162-171`

- [ ] **Step 1: Estender `FieldServiceAssignment`**

Em `src/app/types.ts`, substituir a interface existente por:

```ts
export interface FieldServiceAssignment {
  id: string;
  weekday: string;
  time: string;
  responsible: string;
  responsibleMemberId?: string | null;
  responsible2?: string | null;
  responsible2MemberId?: string | null;
  location: string;
  category: string;
}
```

- [ ] **Step 2: Estender os tipos gerados do Supabase**

Em `src/app/types/supabase.ts`, no bloco `field_service_assignments`, adicionar as duas colunas nos três sub-objetos:

Em `Row` (obrigatórias na leitura, mas nullable):

```ts
          responsible_2: string | null
          responsible_2_member_id: string | null
```

Em `Insert` e em `Update` (opcionais):

```ts
          responsible_2?: string | null
          responsible_2_member_id?: string | null
```

E adicionar a nova FK ao array `Relationships` da tabela, ao lado da que já existe:

```ts
            {
              foreignKeyName: "field_service_assignments_responsible_2_member_id_fkey"
              columns: ["responsible_2_member_id"]
              isOneToOne: false
              referencedRelation: "members"
              referencedColumns: ["id"]
            },
```

- [ ] **Step 3: Estender o input de criação**

Em `src/app/lib/api.ts`, substituir `CreateFieldServiceAssignmentInput` por:

```ts
export interface CreateFieldServiceAssignmentInput {
  month: number;
  year: number;
  weekday: string;
  time: string;
  responsible: string;
  responsible_member_id?: string | null;
  responsible_2?: string | null;
  responsible_2_member_id?: string | null;
  location: string;
  category: string;
}
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`

Expected: sem erros. Os campos novos são todos opcionais, então nenhum call site existente quebra.

- [ ] **Step 5: Commit**

```bash
git add src/app/types.ts src/app/types/supabase.ts src/app/lib/api.ts
git commit -m "feat: type second responsible on field service assignments"
```

---

### Task 4: Mapper expõe o segundo dirigente

**Files:**
- Modify: `src/app/lib/api.ts:255-265`
- Create: `src/app/lib/api.field-service.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/lib/api.field-service.test.ts`. O mock do Supabase segue o mesmo padrão de `src/app/lib/api.designation-history.test.ts` — um builder encadeável que registra as operações e resolve a partir de um mapa de respostas por tabela:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: { message: string } | null };

const { from, responses, queries } = vi.hoisted(() => {
  const responses = new Map<string, QueryResult>();
  const queries: Array<{ table: string; operations: Array<[string, ...unknown[]]> }> = [];
  const from = vi.fn((table: string) => {
    const query = { table, operations: [] as Array<[string, ...unknown[]]> };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'gte', 'lte', 'order', 'in']) {
      builder[method] = (...args: unknown[]) => {
        query.operations.push([method, ...args]);
        return builder;
      };
    }
    const resolveFor = () => Promise.resolve(responses.get(table) ?? { data: [], error: null });
    builder.single = resolveFor;
    builder.maybeSingle = resolveFor;
    builder.then = (resolve: (result: QueryResult) => unknown) => resolveFor().then(resolve);
    return builder;
  });
  return { from, responses, queries };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc: vi.fn() } }));
vi.mock('./offline-cache', () => ({
  readThroughCache: vi.fn(async (_key: string, loader: () => Promise<unknown>) => loader()),
}));

import { api } from './api';

const baseRow = {
  id: 'assignment-1',
  month: 9,
  year: 2026,
  weekday: 'Segunda-feira',
  time: '08:45',
  responsible: 'João Silva',
  responsible_member_id: 'member-1',
  location: 'Salão do Reino',
  category: 'Segunda-feira',
};

describe('field service assignments mapping', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
  });

  it('exposes the second responsible when it is set', async () => {
    responses.set('field_service_assignments', {
      data: [{
        ...baseRow,
        responsible_2: 'Maria Souza',
        responsible_2_member_id: 'member-2',
      }],
      error: null,
    });

    const [assignment] = await api.getFieldServiceAssignments(8, 2026);

    expect(assignment.responsible).toBe('João Silva');
    expect(assignment.responsible2).toBe('Maria Souza');
    expect(assignment.responsible2MemberId).toBe('member-2');
  });

  it('normalizes a missing second responsible to null', async () => {
    responses.set('field_service_assignments', {
      data: [{ ...baseRow, responsible_2: null, responsible_2_member_id: null }],
      error: null,
    });

    const [assignment] = await api.getFieldServiceAssignments(8, 2026);

    expect(assignment.responsible2).toBeNull();
    expect(assignment.responsible2MemberId).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/lib/api.field-service.test.ts`

Expected: FAIL — `expected undefined to be 'Maria Souza'`, porque `mapFieldServiceAssignment` ainda não lê as colunas novas.

- [ ] **Step 3: Atualizar o mapper**

Em `src/app/lib/api.ts`, substituir `mapFieldServiceAssignment` por:

```ts
function mapFieldServiceAssignment(row: any) {
  return {
    id: row.id,
    weekday: row.weekday,
    time: row.time,
    responsible: row.responsible,
    responsibleMemberId: row.responsible_member_id || null,
    responsible2: row.responsible_2 || null,
    responsible2MemberId: row.responsible_2_member_id || null,
    location: row.location,
    category: row.category,
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/app/lib/api.field-service.test.ts`

Expected: PASS — 2 testes.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/api.ts src/app/lib/api.field-service.test.ts
git commit -m "feat: map second responsible on field service assignments"
```

---

### Task 5: Notificação para o segundo dirigente

**Files:**
- Modify: `src/app/lib/api.ts:903-923`
- Modify: `src/app/lib/api.field-service.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `src/app/lib/api.field-service.test.ts`, depois do `describe` existente:

```ts
describe('field service assignment notifications', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
  });

  const notificationSlots = () =>
    queries
      .filter(query => query.table === 'member_assignment_notifications')
      .flatMap(query =>
        query.operations
          .filter(([method]) => method === 'eq')
          .filter(([, column]) => column === 'slot_key')
          .map(([, , value]) => value),
      );

  it('creates a notification slot for the second responsible', async () => {
    responses.set('field_service_assignments', {
      data: {
        ...baseRow,
        responsible_2: 'Maria Souza',
        responsible_2_member_id: 'member-2',
      },
      error: null,
    });

    await api.syncFieldServiceAssignmentNotifications('assignment-1');

    expect(notificationSlots()).toContain('responsible');
    expect(notificationSlots()).toContain('responsible_2');
  });

  it('revokes the second slot when the second responsible is removed', async () => {
    responses.set('field_service_assignments', {
      data: { ...baseRow, responsible_2: null, responsible_2_member_id: null },
      error: null,
    });

    await api.syncFieldServiceAssignmentNotifications('assignment-1');

    // O slot continua sendo visitado mesmo sem membro: é assim que uma
    // notificação anterior do segundo dirigente é revogada.
    expect(notificationSlots()).toContain('responsible_2');

    const revoked = queries
      .filter(query => query.table === 'member_assignment_notifications')
      .some(query =>
        query.operations.some(([method, column, value]) =>
          method === 'update' || (column === 'slot_key' && value === 'responsible_2'),
        ),
      );
    expect(revoked).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/lib/api.field-service.test.ts -t "notification"`

Expected: FAIL nos dois testes — o slot `responsible_2` nunca é visitado.

- [ ] **Step 3: Adicionar o segundo slot**

Em `src/app/lib/api.ts`, substituir o corpo de `syncFieldServiceAssignmentNotifications` por:

```ts
  async syncFieldServiceAssignmentNotifications(assignmentId: string) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar saída de campo para notificação', error));
    if (!data) return;

    await upsertAssignmentNotificationSlot({
      memberId: data.responsible_member_id,
      sourceType: 'field_service_assignment',
      sourceId: data.id,
      slotKey: 'responsible',
      category: 'field_service',
      assignmentDate: null,
      title: 'Nova designação de saída de campo',
      message: `Você foi designado para responsável em ${data.weekday} às ${data.time}.`,
    });

    await upsertAssignmentNotificationSlot({
      memberId: data.responsible_2_member_id,
      sourceType: 'field_service_assignment',
      sourceId: data.id,
      slotKey: 'responsible_2',
      category: 'field_service',
      assignmentDate: null,
      title: 'Nova designação de saída de campo',
      message: `Você foi designado para responsável em ${data.weekday} às ${data.time}.`,
    });
  },
```

A chamada é **incondicional**, sem guarda de `if`. Quando `responsible_2_member_id` é nulo, `upsertAssignmentNotificationSlot` entra no ramo `if (!input.memberId)` (`src/app/lib/api.ts:429`) e revoga qualquer notificação existente naquele slot — que é exatamente o comportamento desejado quando um segundo dirigente é removido. Uma guarda deixaria notificação órfã ativa.

Os dois dirigentes têm o mesmo papel, então a mensagem é idêntica.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/app/lib/api.field-service.test.ts`

Expected: PASS — 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/api.ts src/app/lib/api.field-service.test.ts
git commit -m "feat: notify second field service responsible"
```

---

### Task 6: Histórico de designações inclui o segundo dirigente

**Files:**
- Modify: `src/app/lib/api.ts:2386-2414`
- Modify: `src/app/lib/api.field-service.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `src/app/lib/api.field-service.test.ts`:

```ts
describe('field service designation history', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  it('emits one entry per responsible when both are set', async () => {
    responses.set('members', {
      data: [
        { id: 'member-1', full_name: 'João Silva' },
        { id: 'member-2', full_name: 'Maria Souza' },
      ],
      error: null,
    });
    responses.set('field_service_assignments', {
      data: [{
        id: 'assignment-1',
        month: currentMonth,
        year: currentYear,
        category: 'Segunda-feira',
        weekday: 'Segunda-feira',
        responsible: 'João Silva',
        responsible_member_id: 'member-1',
        responsible_2: 'Maria Souza',
        responsible_2_member_id: 'member-2',
      }],
      error: null,
    });

    const result = await api.getDesignationHistory(1);
    const fieldService = result.filter(entry => entry.source === 'field_service');

    expect(fieldService.map(entry => entry.memberName).sort()).toEqual([
      'João Silva',
      'Maria Souza',
    ]);
    expect(fieldService.map(entry => entry.roleKey).sort()).toEqual([
      'responsible',
      'responsible_2',
    ]);
    expect(fieldService.every(entry => entry.roleLabel === 'Responsável')).toBe(true);
  });

  it('emits a single entry when there is no second responsible', async () => {
    responses.set('members', {
      data: [{ id: 'member-1', full_name: 'João Silva' }],
      error: null,
    });
    responses.set('field_service_assignments', {
      data: [{
        id: 'assignment-1',
        month: currentMonth,
        year: currentYear,
        category: 'Segunda-feira',
        weekday: 'Segunda-feira',
        responsible: 'João Silva',
        responsible_member_id: 'member-1',
        responsible_2: null,
        responsible_2_member_id: null,
      }],
      error: null,
    });

    const result = await api.getDesignationHistory(1);
    const fieldService = result.filter(entry => entry.source === 'field_service');

    expect(fieldService).toHaveLength(1);
    expect(fieldService[0].memberName).toBe('João Silva');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/lib/api.field-service.test.ts -t "history"`

Expected: FAIL no primeiro teste — só uma entrada de `field_service` é emitida.

- [ ] **Step 3: Emitir a segunda entrada**

Em `src/app/lib/api.ts`, incluir as colunas novas no `select` da query de saída de campo:

```ts
      .select('id, month, year, category, weekday, responsible, responsible_member_id, responsible_2, responsible_2_member_id')
```

E, dentro do `for (const row of fieldServiceRows || [])`, logo depois do `addEntry` existente, acrescentar:

```ts
      addEntry({
        date: syntheticDate,
        source: 'field_service',
        sourceId: row.id,
        roleKey: 'responsible_2',
        roleLabel: 'Responsável',
        memberId: row.responsible_2_member_id,
        fallbackName: row.responsible_2,
        details: `${row.category} - ${row.weekday}`,
      });
```

`addEntry` já descarta nomes vazios e `A definir`, então uma linha sem segundo dirigente não gera entrada. O `roleLabel` é o mesmo do primeiro porque os dois têm o mesmo papel — isso mantém a contagem por membro correta.

- [ ] **Step 4: Rodar toda a suíte e confirmar que passa**

Run: `npm run test:run`

Expected: PASS. Além dos 6 testes novos, `src/app/lib/api.designation-history.test.ts` continua verde — a query de saída de campo mudou só o `select`, e aquele arquivo não asserta sobre ele.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/api.ts src/app/lib/api.field-service.test.ts
git commit -m "feat: include second responsible in designation history"
```

---

### Task 7: UI — editar o segundo dirigente

A célula "Responsável" passa a mostrar os dois nomes e permitir editar cada um. Aplica-se a todas as categorias com coluna "Responsável" — Segunda, Terça, Quarta, Sexta, Sábado e Sábado - Rural. Domingo não tem essa coluna, então fica fora automaticamente.

**Files:**
- Modify: `src/app/components/FieldServiceAssignments.tsx`

- [ ] **Step 1: Levar o segundo dirigente até a linha renderizada**

Em `FieldServiceTemplateRow` (linha ~25), adicionar o campo:

```ts
interface FieldServiceTemplateRow {
  key: string;
  category: FieldServiceCategory;
  assignment: FieldServiceAssignment | null;
  dayLabel: string;
  displayTime: string;
  displayResponsible: string;
  displayResponsible2: string | null;
  displayLocation: string;
  groupName?: string;
}
```

Em `buildRenderedGroups`, cada objeto de linha construído a partir de um `item` ganha:

```ts
            displayResponsible2: item.responsible2 || null,
```

E cada linha placeholder (a das categorias fixas sem assignment, e as de Domingo) ganha:

```ts
            displayResponsible2: null,
```

São 5 lugares no total: o `.map` das categorias fixas, o placeholder das fixas, o `.map` de Sábado, o `.map` de Sábado - Rural e o `.map` de Domingo.

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: sem erros. Se o compilador reclamar de `displayResponsible2` faltando em algum objeto, é um dos 5 lugares acima — adicionar lá.

- [ ] **Step 3: Estender o estado do modal para saber qual campo edita**

Trocar a declaração do estado (linha ~81) por:

```ts
  const [memberEditModal, setMemberEditModal] = useState<{
    id: string;
    field: 'responsible' | 'responsible_2';
    currentValue: string;
  } | null>(null);
```

Substituir `handleEditResponsible` por uma versão que recebe o campo:

```ts
  const handleEditResponsible = (
    assignment: FieldServiceAssignment | null,
    field: 'responsible' | 'responsible_2' = 'responsible',
  ) => {
    if (!canEdit) {
      return;
    }

    if (!ensureAssignmentExists(assignment)) {
      return;
    }

    const rawValue = field === 'responsible' ? assignment.responsible : assignment.responsible2;

    setMemberEditModal({
      id: assignment.id,
      field,
      currentValue: rawValue && rawValue !== 'A definir' ? rawValue : '',
    });
  };
```

Substituir `handleSaveResponsible` por uma versão que grava no campo certo. Salvar vazio no segundo dirigente equivale a removê-lo; no primeiro, vira `A definir`, porque a coluna é `NOT NULL`:

```ts
  const handleSaveResponsible = async (newValue: string) => {
    if (!memberEditModal) {
      return;
    }

    const isSecond = memberEditModal.field === 'responsible_2';
    const payload = isSecond
      ? {
        responsible_2: newValue || null,
        responsible_2_member_id: newValue ? findMemberIdByName(newValue) : null,
      }
      : {
        responsible: newValue || 'A definir',
        responsible_member_id: newValue ? findMemberIdByName(newValue) : null,
      };

    try {
      setSaving(true);
      const updated = await api.updateFieldServiceAssignment(memberEditModal.id, payload);
      setData(prev => prev.map(item => (item.id === memberEditModal.id ? updated : item)));
      setMemberEditModal(null);
      toast.success(isSecond ? '2º dirigente atualizado!' : 'Responsável atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar responsável.');
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 4: Renderizar os dois nomes na célula**

Substituir `renderResponsibleButton` por:

```ts
  const renderResponsibleButton = (row: FieldServiceTemplateRow) => {
    const hasSecond = Boolean(row.displayResponsible2);

    if (!canEdit) {
      return (
        <div className={`w-full rounded-lg px-3 py-2 text-left ${row.assignment ? 'text-gray-700' : 'text-gray-400'}`}>
          <span className={row.displayResponsible === 'A definir' ? 'italic' : ''}>{row.displayResponsible}</span>
          {hasSecond && <span className="text-gray-700"> / {row.displayResponsible2}</span>}
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="flex flex-wrap items-center">
          <button
            type="button"
            onClick={() => handleEditResponsible(row.assignment, 'responsible')}
            disabled={loading || generating || saving}
            className={`rounded-lg px-3 py-1.5 text-left transition-colors ${row.assignment ? 'text-gray-700 hover:bg-green-100/70' : 'text-gray-400 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span className={row.displayResponsible === 'A definir' ? 'italic' : ''}>{row.displayResponsible}</span>
          </button>
          {hasSecond && (
            <>
              <span className="text-gray-400">/</span>
              <button
                type="button"
                onClick={() => handleEditResponsible(row.assignment, 'responsible_2')}
                disabled={loading || generating || saving}
                className="rounded-lg px-3 py-1.5 text-left text-gray-700 transition-colors hover:bg-green-100/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {row.displayResponsible2}
              </button>
            </>
          )}
        </div>
        {!hasSecond && row.assignment && (
          <button
            type="button"
            onClick={() => handleEditResponsible(row.assignment, 'responsible_2')}
            disabled={loading || generating || saving}
            className="ml-3 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.75rem' }}
          >
            + 2º dirigente
          </button>
        )}
      </div>
    );
  };
```

A ação "+ 2º dirigente" só aparece em linhas já geradas (`row.assignment` não nulo), porque não há o que atualizar numa linha placeholder.

- [ ] **Step 5: Dar ao modal a ação de remover e evitar nome duplicado**

`MemberSelectModal` ganha duas props. `allowRemove` mostra o botão "Remover"; `excludeName` esconde da lista quem já ocupa o outro slot. Trocar a assinatura e o corpo por:

```tsx
function MemberSelectModal({
  label,
  currentValue,
  onClose,
  onSave,
  members,
  saving,
  allowRemove = false,
  excludeName = null,
}: {
  label: string;
  currentValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
  members: { id: string; full_name: string }[];
  saving: boolean;
  allowRemove?: boolean;
  excludeName?: string | null;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentValue);
  const filteredFixedOptions = FIXED_RESPONSIBLE_OPTIONS.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = members.filter(member =>
    member.full_name.toLowerCase().includes(search.toLowerCase())
    && member.full_name !== excludeName
  );
```

O restante do corpo do componente fica igual, exceto o rodapé, que passa a incluir o botão "Remover" à esquerda:

```tsx
        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          {allowRemove && (
            <button
              onClick={() => onSave('')}
              disabled={saving}
              className="mr-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontSize: '0.9rem' }}
            >
              Remover
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={saving}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
```

- [ ] **Step 6: Ligar as props novas na chamada do modal**

Substituir o bloco de renderização do modal (linha ~904) por:

```tsx
      {canEdit && memberEditModal && (
        <MemberSelectModal
          label={
            memberEditModal.field === 'responsible_2'
              ? '2º Dirigente da Saída de Campo'
              : 'Responsável pela Saída de Campo'
          }
          currentValue={memberEditModal.currentValue}
          onClose={() => setMemberEditModal(null)}
          onSave={handleSaveResponsible}
          members={members}
          saving={saving}
          allowRemove={memberEditModal.field === 'responsible_2'}
          excludeName={
            memberEditModal.field === 'responsible_2'
              ? data.find(item => item.id === memberEditModal.id)?.responsible ?? null
              : data.find(item => item.id === memberEditModal.id)?.responsible2 ?? null
          }
        />
      )}
```

- [ ] **Step 7: Verificar compilação e suíte**

Run: `npx tsc --noEmit && npm run test:run`

Expected: sem erros de tipo; todos os testes passando.

- [ ] **Step 8: Verificar no app**

Run: `npm run dev`

Abrir a tela de saída de campo, gerar o mês se necessário e conferir:
1. Numa linha de Segunda-feira, "+ 2º dirigente" aparece abaixo do responsável.
2. Ao clicar, o modal abre com o título "2º Dirigente da Saída de Campo" e sem o nome já usado no primeiro campo na lista.
3. Após salvar, a célula mostra `Nome 1 / Nome 2`, e cada nome abre seu próprio modal.
4. No modal do segundo, "Remover" volta a linha para um responsável só.
5. O mesmo funciona nos cards mobile (janela estreita) — `renderResponsibleButton` é compartilhado entre as duas visões.

- [ ] **Step 9: Commit**

```bash
git add src/app/components/FieldServiceAssignments.tsx
git commit -m "feat: edit second field service responsible in the schedule"
```

---

### Task 8: Exportação mostra os dois nomes

**Files:**
- Modify: `src/app/components/FieldServiceAssignments.tsx:1049`

- [ ] **Step 1: Concatenar os nomes na célula exportada**

No bloco de exportação (a `<div ref={exportRef}>`), na célula do responsável, substituir:

```tsx
                                <td className="px-2.5 py-1 text-gray-700" style={{ lineHeight: 1.05 }}>{row.displayResponsible || 'A definir'}</td>
```

por:

```tsx
                                <td className="px-2.5 py-1 text-gray-700" style={{ lineHeight: 1.05 }}>
                                  {row.displayResponsible2
                                    ? `${row.displayResponsible || 'A definir'} / ${row.displayResponsible2}`
                                    : row.displayResponsible || 'A definir'}
                                </td>
```

O layout de colunas não muda — o texto concatenado ocupa a mesma célula de 25% de largura.

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 3: Verificar a exportação no app**

Run: `npm run dev`

Numa linha com dois dirigentes, exportar como imagem e como PDF. Conferir que a célula "Responsável" mostra `Nome 1 / Nome 2` e que a tabela não estourou a largura da página. Numa linha com um dirigente só, conferir que aparece apenas o primeiro nome, sem barra sobrando.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/FieldServiceAssignments.tsx
git commit -m "feat: show both field service responsibles in exports"
```

---

### Task 9: Verificação final

- [ ] **Step 1: Rodar a suíte completa**

Run: `npm run test:run`

Expected: todos os testes passando, incluindo os 6 novos em `api.field-service.test.ts`.

- [ ] **Step 2: Rodar os testes de banco**

Run: `npm run test:db`

Expected: `field_service_second_responsible.test.sql .. ok` com 9 asserções, e `member_congregation_transfer.test.sql` continuando verde.

- [ ] **Step 3: Verificar o build**

Run: `npm run build`

Expected: build concluído sem erros.

- [ ] **Step 4: Revisar o diff**

Run: `git log --oneline main..HEAD` e `git diff main --stat`

Conferir que só os 7 arquivos previstos em "File Structure" foram tocados.
