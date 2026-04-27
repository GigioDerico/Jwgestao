# Feature Specification: Exportar Lista de Membros

**Feature Branch**: `001-member-list-export`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: User description: "impressão da lista de membros em pdf e excel, ao solicitar a impressão deve ser questionado ao user se ele quer gerar o documento separado por grupos, se sim, a lista deve conter os membros separados por seus respectivos grupos"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exportar Lista em PDF (Priority: P1)

O usuário acessa a tela Membros e deseja gerar um documento PDF com a lista de membros. Ao clicar na ação de exportar, o sistema apresenta um diálogo para escolher se a lista deve ser agrupada por grupos de campo. Após confirmar, o sistema gera e disponibiliza o arquivo PDF para download.

**Why this priority**: Exportação em PDF é o formato mais comum para compartilhamento e impressão física em contextos congregacionais. Entrega valor imediato para secretários e coordenadores.

**Independent Test**: Pode ser testado isoladamente abrindo a tela Membros, clicando em exportar, selecionando PDF (com ou sem agrupamento) e verificando se o arquivo gerado contém os dados corretos.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela Membros com a lista de membros visível, **When** ele clica na ação de exportar/imprimir, **Then** o sistema exibe um diálogo com opções de formato (PDF/Excel) e uma pergunta sobre agrupamento por grupos.
2. **Given** o diálogo de exportação está aberto e o usuário selecionou PDF sem agrupamento, **When** ele confirma a exportação, **Then** o sistema gera um PDF com todos os membros em ordem alfabética e inicia o download.
3. **Given** o diálogo de exportação está aberto e o usuário selecionou PDF com agrupamento, **When** ele confirma a exportação, **Then** o sistema gera um PDF com os membros organizados por seus respectivos grupos de campo, com o nome do grupo como cabeçalho de cada seção.

---

### User Story 2 - Exportar Lista em Excel (Priority: P2)

O usuário acessa a tela Membros e deseja gerar uma planilha Excel com a lista de membros. O fluxo segue o mesmo padrão do PDF: diálogo de opções, escolha de formato e agrupamento, geração do arquivo.

**Why this priority**: Excel permite edição e análise posterior dos dados. É útil para secretários que precisam manipular informações fora do sistema.

**Independent Test**: Pode ser testado isoladamente da mesma forma que US1, apenas selecionando Excel como formato. O arquivo gerado deve abrir corretamente em aplicativos de planilha.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela Membros, **When** ele inicia a exportação e seleciona Excel sem agrupamento, **Then** o sistema gera um arquivo Excel (.xlsx) com todos os membros em uma única aba/lista em ordem alfabética.
2. **Given** o usuário selecionou Excel com agrupamento por grupos, **When** ele confirma a exportação, **Then** o sistema gera um arquivo Excel onde os membros estão organizados por grupos de campo, possivelmente em abas separadas ou com seções distintas.

---

### Edge Cases

- O que acontece quando não há membros cadastrados? O sistema deve exibir uma mensagem informativa e não gerar arquivo vazio.
- O que acontece quando o usuário não tem permissão de exportação? A ação de exportar não deve aparecer ou deve estar desabilitada.
- Como o sistema lida com filtros aplicados na tela Membros? A exportação deve respeitar os filtros ativos, exportando apenas os membros visíveis.
- O que acontece se um membro não pertence a nenhum grupo de campo? Em modo agrupado, ele deve aparecer em uma seção "Sem grupo" ou similar.
- O usuário cancela o diálogo de exportação? O sistema fecha o diálogo sem gerar arquivo e sem alterar o estado da tela.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema deve exibir uma ação de exportação na tela Membros, visível apenas para perfis com permissão adequada.
- **FR-002**: Ao acionar a exportação, o sistema deve exibir um diálogo modal com as opções: formato do documento (PDF ou Excel) e checkbox/pergunta "Agrupar por grupos de campo?"
- **FR-003**: O sistema deve gerar um arquivo PDF contendo a lista de membros quando o formato PDF for selecionado.
- **FR-004**: O sistema deve gerar um arquivo Excel (.xlsx) contendo a lista de membros quando o formato Excel for selecionado.
- **FR-005**: Quando a opção de agrupamento estiver selecionada, os membros devem ser organizados por seu grupo de campo, com identificação visual do nome do grupo.
- **FR-006**: Quando a opção de agrupamento não estiver selecionada, os membros devem ser listados em ordem alfabética pelo nome.
- **FR-007**: O documento gerado deve conter as informações essenciais de cada membro: nome completo, telefone, situação espiritual e grupo de campo.
- **FR-008**: A exportação deve respeitar quaisquer filtros ativos na tela Membros no momento da solicitação.
- **FR-009**: Se não houver membros na lista filtrada, o sistema deve exibir uma mensagem amigável e não gerar arquivo vazio.
- **FR-010**: O usuário deve poder cancelar o diálogo de exportação a qualquer momento sem efeitos colaterais.

### Key Entities *(include if feature involves data)*

- **Membro**: Representa um irmão ou estudante cadastrado. Atributos relevantes: nome completo, telefone, situação espiritual, grupo de campo.
- **Grupo de Campo**: Representa um grupo de saída de campo. Atributos relevantes: nome do grupo, dirigente, ajudante. Usado como critério de agrupamento na exportação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem completar o fluxo de exportação (do clique até o download) em menos de 30 segundos.
- **SC-002**: 95% dos usuários entendem a opção de agrupamento sem necessidade de treinamento adicional (medido por testes de usabilidade ou feedback).
- **SC-003**: O documento gerado contém 100% dos membros visíveis na lista filtrada da tela Membros, sem omissões ou duplicatas.
- **SC-004**: Quando agrupado por grupos, 100% dos membros aparecem na seção correta correspondente ao seu grupo de campo.
- **SC-005**: O sistema exibe feedback claro em caso de lista vazia, evitando geração de arquivos sem conteúdo.

## Assumptions

- O usuário possui permissão para visualizar a tela Membros e a ação de exportação está habilitada para seu perfil.
- Os grupos de campo são previamente configurados no módulo Configurações.
- A exportação respeita os filtros ativos na tela Membros (por situação espiritual, grupo, etc.).
- O documento PDF segue o padrão visual do sistema (tipografia, cores institucionais) mas não exige design elaborado.
- A planilha Excel contém dados estruturados com cabeçalhos, sem necessidade de fórmulas complexas.
- O recurso de exportação está disponível tanto em desktop quanto em mobile, com prioridade para desktop devido à natureza administrativa.
