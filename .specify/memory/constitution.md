<!--
SYNC IMPACT REPORT
==================
Version Change: 0.0.0 → 1.0.0 (initial ratification)
Modified Principles: N/A (first constitution)
Added Sections:
  - I. Consistência Visual com Tokens Semânticos
  - II. Clareza Administrativa e Foco em Produtividade
  - III. Permissões e Segurança por Perfil
  - IV. Fluxos Operacionais Simples e Reversíveis
  - V. Documentação Intencional e Contextual
  - Design System & Accessibility Standards
  - Governance
Removed Sections: N/A
Templates Requiring Updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check gate aligned)
  - ✅ .specify/templates/spec-template.md (no agent-specific references)
  - ✅ .specify/templates/tasks-template.md (no agent-specific references)
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Original adoption date unknown; set to 2026-04-27 as first documented ratification.
-->

# JW Gestao Constitution

## Core Principles

### I. Consistência Visual com Tokens Semânticos

Toda nova interface deve utilizar tokens do tema (`bg-card`, `text-foreground`, `border-border`, `bg-primary`, etc.) em vez de valores hexadecimais hardcoded.

- Refatorações de código existente devem substituir hex duplicados por tokens semânticos (`primary`, `primary-foreground`, `accent`, `border`).
- Componentes de UI compartilhados são a fonte primária de consistência visual.
- A introdução de novas cores hardcoded é proibida sem justificativa documentada.

**Rationale**: O projeto hoje mistura tokens e hex, aumentando custo de manutenção. Tokens unificam a linguagem visual e aceleram entregas.

### II. Clareza Administrativa e Foco em Produtividade

A interface deve ser clara, leve e voltada para produtividade em contextos administrativos congregacionais.

- Animacoes devem ser curtas e discretas; animacoes chamativas sao proibidas em fluxos administrativos.
- Desktop deve ser otimizado para produtividade e leitura comparativa.
- Mobile deve priorizar modais, formularios e acoes rapidas.
- Densidade de informacao deve ser equilibrada: alta onde necessaria (listas, tabelas), leve onde o foco e acao (CTAs, formularios).

**Rationale**: Os usuarios principais (coordenadores, secretarios, designadores) operam o sistema semanalmente sob demanda de tempo. Interfaces densas ou pesadas reduzem adocao.

### III. Permissoes e Seguranca por Perfil

O sistema e multi-perfil e cada tela ou acao deve respeitar a matriz de permissoes configurada.

- Perfis padrao: `coordenador`, `secretario`, `designador`, `publicador`.
- Telas e acoes de edicao/exclusao devem estar inacessiveis para perfis sem permissao explicita.
- Alteracoes na matriz de permissoes em Configuracoes devem refletir imediatamente na navegacao e nos endpoints.
- Dados pessoais de membros (telefone, email, endereco, contato de emergencia) devem ser tratados com restricao de acesso compativel com o perfil do usuario.

**Rationale**: O sistema gerencia dados sensiveis de membros e designacoes. Controle de acesso por perfil evita exposicao indevida e erros operacionais.

### IV. Fluxos Operacionais Simples e Reversiveis

As rotinas principais do sistema — cadastro de membros, montagem de designacoes, exportacao de escalas, confirmacoes — devem ser diretas e reversiveis quando possivel.

- O usuario deve poder revisar dados antes de salvar designacoes ou gerar exportacoes (JPG/PDF).
- Exportacoes devem indicar claramente o mes, os nomes e os horarios revisados.
- Notificacoes de designacao devem permitir confirmacao ou recusa pelo membro designado.
- Formularios de cadastro devem validar campos obrigatorios antes do envio e permitir correcao.

**Rationale**: Erros em escalas congregacionais geram retrabalho e comunicacao manual. Revisibilidade e validacao previa reduzem suporte e retrabalho.

### V. Documentacao Intencional e Contextual

Documentacao tecnica so deve ser criada mediante solicitacao explicita do usuario.

- Comentarios de codigo devem explicar o PORQUE (regra de negocio, decisao arquitetural, "pegadinha"), nao o QUE (nome de variavel ja autoexplicativo).
- READMEs e guias devem conter Quick Start de ate 5 minutos.
- Documentacao de API deve cobrir 100%% dos endpoints, com modelos de entrada/saida e cenarios de erro.
- Documentacao desatualizada deve ser corrigida ou removida; nao pode permanecer obsoleta.

**Rationale**: Documentacao excessiva ou desatualizada confunde mais do que ajuda. Documentacao sob demanda garante relevancia e manutencao.

## Design System & Accessibility Standards

### Tokens e Componentes

- Fundo de pagina: `bg-background`.
- Cards estruturais: `bg-card`, `border-border`, `rounded-xl`, `shadow-sm`.
- Texto principal: `text-foreground`; texto de apoio: `text-muted-foreground`.
- Cor de acao/destaque: `primary` aplicada apenas em CTAs, foco, estado ativo e destaque.
- Inputs e selects: `bg-card`, `border-border`, `focus:ring-primary`, `rounded-lg`.
- Avatares: circulo com iniciais, fundo `bg-primary` ou `bg-accent`.
- Badges e chips: fundo semantico claro, texto de alto contraste, `rounded-full`.

### Responsividade

- Grids devem comecar em `grid-cols-1` e expandir progressivamente em `md` e `lg`.
- Sidebar recolhida em mobile com overlay.
- Mobile primeiro para modais e formularios; desktop otimizado para leitura comparativa.

### Acessibilidade Minima

- Contraste entre fundo e texto principal deve permanecer adequado.
- Estados de foco (`focus:ring-primary`) obrigatorios em todos os formularios.
- Botoes icon-only devem ter `aria-label` consistente.
- Tamanho de clique minimo adequado em botoes principais.

## Governance

### Amendment Procedure

1. Propostas de alteracao na constituicao devem ser documentadas em `.specify/memory/constitution.md`.
2. Alteracoes devem incluir justificativa de impacto e revisao de templates dependentes.
3. Alteracoes que afetem principios existentes exigem aprovacao explicita antes de promulgacao.

### Versioning Policy

- `MAJOR`: Remocao ou redefinicao incompativel de principio.
- `MINOR`: Adicao de novo principio ou secao, ou expansao material de orientacao.
- `PATCH`: Clareza, correcao de redacao, refinamentos semanticos.

### Compliance Review

- Todo plano de implementacao (`plan.md`) deve passar pelo Constitution Check antes da fase de pesquisa.
- Todo `spec.md` deve respeitar as secoes obrigatorias definidas nos templates do projeto.
- Pull requests devem verificar alinhamento com tokens do design system e permissões por perfil.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown; first documented ratification on 2026-04-27 | **Last Amended**: 2026-04-27
