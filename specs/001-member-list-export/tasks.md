# Tasks: Exportar Lista de Membros

**Input**: Design documents from `/specs/001-member-list-export/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ui-member-export-dialog.md

**Tests**: Tests are OPTIONAL - not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Install `xlsx` library for Excel generation: `pnpm add xlsx` or `npm install xlsx`
- [x] T002 [P] Install types for xlsx if needed: `pnpm add -D @types/xlsx` (if separate package required)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add `export_members` permission to `DEFAULT_PERMISSIONS` in `src/app/hooks/usePermissions.ts`
  - coordenador: true
  - secretario: true
  - designador: false
  - publicador: false
- [x] T004 [P] Add `export_members` mapping in `dbRowToMatrix` function in `src/app/hooks/usePermissions.ts`
- [x] T005 Create `src/app/lib/member-export.ts` with shared types and helper functions:
  - `MemberWithGroup` type
  - `enrichMembersWithGroups(members, groups)` function
  - `groupMembersByFieldService(membersWithGroups)` function
  - `sortMembersAlphabetically(members)` function
- [x] T006 [P] Create `src/app/components/MemberExportDialog.tsx` shell component with basic props interface

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Exportar Lista em PDF (Priority: P1) 🎯 MVP

**Goal**: Implement PDF export functionality for member lists, with optional grouping by field service groups

**Independent Test**: Open Members page, click export, select PDF (with/without grouping), verify file downloads and contains correct data

### Implementation for User Story 1

- [x] T007 [P] [US1] Build `MemberExportDialog` UI with Radix Dialog in `src/app/components/MemberExportDialog.tsx`
  - Format selection: PDF / Excel (RadioGroup)
  - Grouping checkbox: "Agrupar por grupos de campo"
  - Confirm / Cancel buttons
  - Use Tailwind tokens: `bg-card`, `border-border`, `text-foreground`, `primary`
- [x] T008 [P] [US1] Add export button to `src/app/pages/Members.tsx`
  - Conditionally render based on `can('export_members')`
  - Position near "Adicionar Novo Membro" button or in filters area
- [x] T009 [US1] Implement `generateMemberListPdf(members, groups, options)` in `src/app/lib/member-export.ts`
  - Build hidden DOM element with formatted member table
  - Support grouped and ungrouped layouts
  - Use existing `downloadElementAsPdf` from `dom-export.ts`
- [x] T010 [US1] Wire up PDF export flow in `src/app/pages/Members.tsx`
  - Pass filtered members to dialog
  - Handle export confirmation with selected options
  - Show loading state during generation
  - Handle empty list: display toast/message instead of generating file

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Exportar Lista em Excel (Priority: P2)

**Goal**: Implement Excel (.xlsx) export functionality for member lists, with optional grouping by field service groups

**Independent Test**: Open Members page, click export, select Excel (with/without grouping), verify .xlsx file downloads and opens correctly in spreadsheet apps

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement `generateMemberListExcel(members, groups, options)` in `src/app/lib/member-export.ts`
  - Use `xlsx` library to create workbook
  - Ungrouped: single sheet with all members alphabetically sorted
  - Grouped: one sheet per field service group + "Sem grupo" sheet
  - Include headers: Nome, Telefone, Situação Espiritual, Grupo
- [x] T012 [US2] Integrate Excel export option in `src/app/components/MemberExportDialog.tsx`
  - Radio group already supports PDF/Excel from US1
  - Call appropriate generator based on selected format
- [x] T013 [US2] Add Excel download handler in `src/app/pages/Members.tsx`
  - Trigger `generateMemberListExcel` when format is Excel
  - Use `file-saver` or native blob download (reuse `downloadBlob` pattern from `dom-export.ts`)
  - Handle loading state and empty list

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 [P] Handle edge case: members without group in grouped mode → render under "Sem grupo" section/sheet
- [x] T015 [P] Ensure export respects active filters in `Members.tsx` (search term, role filter)
- [x] T016 [P] Add `aria-label` to export button and dialog controls for accessibility
- [x] T017 Verify mobile responsiveness of `MemberExportDialog` (scroll, touch targets)
- [x] T018 [P] Add loading and error states in dialog and page during export generation
- [x] T019 Test empty list scenario: verify message appears and no file is generated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - T003/T004 (permissions) can run in parallel with T005/T006 (lib + dialog shell)
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
  - T007 (dialog UI) and T008 (page button) can run in parallel
  - T009 (PDF generator) can run in parallel with T007/T008
  - T010 (wire up) depends on T007, T008, T009
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 dialog completion
  - Can start once T007 (dialog) is complete
  - T011 (Excel generator) can run in parallel with T012 (dialog integration) once dialog exists
  - T013 (page handler) depends on T011 and T012
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational + US1 dialog (T007) - Reuses dialog UI

### Within Each User Story

- Models/helpers before UI integration
- Dialog component before page wiring
- Core implementation before polish

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- T007, T008, T009 (US1) can run in parallel
- T011, T012 (US2) can run in parallel once T007 is done
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all independent US1 tasks together:
Task: "Build MemberExportDialog UI in src/app/components/MemberExportDialog.tsx"
Task: "Add export button to src/app/pages/Members.tsx"
Task: "Implement generateMemberListPdf in src/app/lib/member-export.ts"

# Then wire up (depends on above):
Task: "Wire up PDF export flow in src/app/pages/Members.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (PDF export)
4. **STOP and VALIDATE**: Test PDF export independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (PDF)
   - Developer B: User Story 2 (Excel) - can start once dialog UI is done
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
