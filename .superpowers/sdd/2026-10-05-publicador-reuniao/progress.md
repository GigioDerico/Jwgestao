# Publicador Reunião — execution ledger

## Scope decisions and costs

| Decision | Ruling | Cost if the assumption is wrong |
|---|---|---|
| Historical response evidence | Preserve known response evidence; display “Sem resposta registrada” for past assignments without recorded evidence. A sent/hidden notification alone does not prove a response. | Some older records can show less response history than users expect. |
| Tenant boundary | One congregation per installation; no `congregation_id` added because meeting schema has no tenant fields. | Multi-congregation hosting will need a separate schema/security migration. |
| Workspace isolation | Implement on `codex/publicador-reuniao` worktree; leave existing user changes in the original workspace untouched. | The feature remains a branch and needs a later integration decision. |
| Meeting write serialization | All legacy meeting writers use the same deterministic whole-installation lock (midweek UUIDs, then weekend UUIDs); the atomic program RPC acquires it before parent/part writes. | Unrelated meeting writes serialize, reducing concurrent edit throughput. |

## Execution status

- Approved scope: personal assignment-only meeting view for Publicador, confirm/refuse with reason, and direct versioned WhatsApp path; preserve current coordinator/designer meeting administration route.
- Tasks 1–7 implemented in commits on the feature branch. Task 8 integration/documentation report: `task-8-report.md`.
- Focused tests: 103 passed. Full frontend suite: 273 passed; 13 baseline fixed-date failures remain. Build passes with noted warnings.
- Local pgTAP, policies/grants/advisors, and live account/browser validation blocked by unavailable local Postgres/container runtime. No remote database, deployment, or merge performed.
