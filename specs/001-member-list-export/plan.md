# Implementation Plan: Exportar Lista de Membros

**Branch**: `001-member-list-export` | **Date**: 2026-04-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-member-list-export/spec.md`

## Summary

Adicionar à tela Membros a capacidade de exportar a lista filtrada em PDF e Excel, com opção de agrupar os membros por seus respectivos grupos de campo. A funcionalidade deve respeitar filtros ativos, permissões de perfil e seguir o padrão de exportação já existente no sistema (JPG/PDF via DOM-to-canvas).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.3.1  
**Primary Dependencies**: Vite 6.3.5, Tailwind CSS 4.1.12, shadcn/ui (Radix UI), Supabase JS Client 2.97.0  
**Storage**: Supabase PostgreSQL (tabelas `members`, `field_service_groups`)  
**Testing**: Nenhum framework de teste configurado no projeto  
**Target Platform**: Web (desktop prioridade), Android/iOS via Capacitor  
**Project Type**: Web application (SPA com React Router v7)  
**Performance Goals**: Geração de exportação em menos de 5 segundos para listas de até 200 membros  
**Constraints**: Funcionamento offline parcial (dados carregados em memória); suporte a Capacitor/iOS requer fallback de impressão  
**Scale/Scope**: Congregações típicas de 50-200 membros

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Consistência Visual com Tokens | ✅ Pass | Diálogo modal usará tokens do tema (`bg-card`, `border-border`, `text-foreground`, `primary`); nenhuma cor hardcoded nova |
| II. Clareza Administrativa | ✅ Pass | Fluxo de 2 cliques + confirmação; desktop otimizado; mobile suportado via scroll do diálogo |
| III. Permissões e Segurança por Perfil | ⚠️ Action Required | Nova permissão `export_members` deve ser adicionada à matriz de permissões (`usePermissions.ts`, tabela `role_permissions`, DEFAULT_PERMISSIONS) |
| IV. Fluxos Operacionais Simples e Reversíveis | ✅ Pass | Diálogo cancelável; pré-visualização implícita pela tabela visível; nenhuma mutação de dados |
| V. Documentação Intencional | N/A | Não aplica — funcionalidade de produto, não infraestrutura |

**Constitution Check Result**: PASS com ação obrigatória de adicionar permissão `export_members` antes do merge.

## Project Structure

### Documentation (this feature)

```text
specs/001-member-list-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── components/
│   │   ├── ExportActions.tsx          # Existente — componente base de exportação
│   │   ├── MembersList.tsx            # Lista de membros (possível reuso)
│   │   └── MemberExportDialog.tsx     # NOVO — diálogo de opções de exportação
│   ├── pages/
│   │   └── Members.tsx                # EXISTENTE — adicionar botão de exportação
│   ├── lib/
│   │   ├── dom-export.ts              # EXISTENTE — exportação JPG/PDF via canvas
│   │   └── member-export.ts           # NOVO — lógica de exportação de membros (PDF + Excel)
│   └── hooks/
│       └── usePermissions.ts          # EXISTENTE — adicionar `export_members`
└── ...
```

**Structure Decision**: Single project SPA. Reutilizar infraestrutura de exportação existente (`dom-export.ts`) para PDF e adicionar biblioteca `xlsx` para Excel. O diálogo de exportação será um componente React reutilizável que segue o padrão de UI do sistema (Radix Dialog + Tailwind tokens).

## Constitution Check (Post-Design)

*Re-evaluation after Phase 1 design complete.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Consistência Visual com Tokens | ✅ Pass | `MemberExportDialog` contratualmente vinculado a tokens (`bg-card`, `border-border`, `text-foreground`, `primary`, `primary-foreground`). Nenhum hex hardcoded introduzido. |
| II. Clareza Administrativa | ✅ Pass | Diálogo de 2 etapas (formato + agrupamento), desktop-first, mobile suportado. |
| III. Permissões e Segurança por Perfil | ⚠️ Action Required | `export_members` documentada em `usePermissions.ts`, `DEFAULT_PERMISSIONS`, e `role_permissions`. Deve ser implementada antes do merge. |
| IV. Fluxos Operacionais Simples e Reversíveis | ✅ Pass | Cancelável, sem mutação de dados, respeita filtros ativos. |
| V. Documentação Intencional | N/A | Não aplica. |

**Post-Design Constitution Check Result**: PASS. A ação obrigatória de permissão está rastreada e será convertida em task no `/speckit-tasks`.

## Complexity Tracking

> No violations identified. A feature é um incremento funcional sobre infraestrutura existente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
