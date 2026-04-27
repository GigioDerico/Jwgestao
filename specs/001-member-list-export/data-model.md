# Data Model: Exportar Lista de Membros

## Entities

### Member (existente — referência)

Fonte: `supabase-types.ts` → `public.Tables.members.Row`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string (uuid) | Yes | PK |
| full_name | string | Yes | Nome completo do membro |
| phone | string \| null | No | Telefone para contato |
| email | string \| null | No | E-mail |
| spiritual_status | spiritual_status_enum \| null | No | `publicador_batizado`, `publicador`, `estudante` |
| group_id | string (uuid) \| null | No | FK → `field_service_groups.id` |
| gender | gender_enum | Yes | `masculino`, `feminino` |
| avatar_url | string \| null | No | URL do avatar |
| created_at | string (timestamp) | No | Data de cadastro |

### FieldServiceGroup (existente — referência)

Fonte: `supabase-types.ts` → `public.Tables.field_service_groups.Row`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string (uuid) | Yes | PK |
| name | string | Yes | Nome do grupo de campo |
| overseer_id | string (uuid) \| null | No | FK → `members.id` (dirigente) |
| created_at | string (timestamp) | No | Data de criação |

### MemberWithGroup (view/derived)

Entidade derivada para a exportação. Representa um membro enriquecido com o nome do seu grupo de campo.

| Field | Type | Required | Source |
|-------|------|----------|--------|
| id | string | Yes | members.id |
| full_name | string | Yes | members.full_name |
| phone | string \| null | No | members.phone |
| email | string \| null | No | members.email |
| spiritual_status | string \| null | No | members.spiritual_status |
| group_id | string \| null | No | members.group_id |
| group_name | string \| null | No | field_service_groups.name (JOIN) |
| gender | string | Yes | members.gender |

## Relationships

```
members.group_id ──> field_service_groups.id
```

- Um membro pode pertencer a zero ou um grupo de campo (`group_id` nullable).
- Um grupo de campo pode conter zero ou mais membros.

## Data Flow

1. **Fetch**: `Members.tsx` já carrega a lista de membros via `api.getMembers()`.
2. **Filter**: A lista é filtrada localmente por busca textual e situação espiritual.
3. **Enrich**: Para exportação agrupada, os membros devem ser associados aos nomes dos grupos. Isso pode ser feito:
   - (a) Carregando os grupos previamente e fazendo lookup local pelo `group_id`, ou
   - (b) Alterando a query do Supabase para fazer JOIN com `field_service_groups`.
4. **Group** (se selecionado): Agrupar `MemberWithGroup[]` por `group_name` (ou "Sem grupo" para `null`).
5. **Sort**: Dentro de cada grupo, ordenar alfabeticamente por `full_name`.
6. **Render/Export**: Passar os dados estruturados para o gerador PDF ou Excel.

## Validation Rules

- Lista vazia: exibir mensagem amigável, não gerar arquivo.
- Permissão: verificar `can('export_members')` antes de exibir o botão de exportação.
