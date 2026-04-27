# Research: Exportar Lista de Membros

## Decision: Biblioteca para Geração de Excel

**Decision**: Usar `xlsx` (SheetJS) via `xlsx-style` ou a versão community `xlsx` para geração de arquivos Excel (.xlsx) no frontend.

**Rationale**:
- É a biblioteca mais madura e amplamente adotada para manipulação de planilhas em JavaScript/TypeScript.
- Suporta leitura e escrita de múltiplos formatos (XLSX, CSV, etc.).
- Funciona puramente no cliente (browser), sem necessidade de backend.
- Permite criar múltiplas abas/worksheets, ideal para o agrupamento por grupos de campo.
- Licença permissiva para uso não-commercial / open source.

**Alternatives considered**:
- `exceljs`: Mais moderna e rica em recursos (formatação, imagens), porém bundle maior (~500KB+). Overkill para listas simples.
- `file-saver` + CSV manual: CSV é simples mas não atende ao requisito de Excel e não suporta múltiplas abas nativamente.
- Gerar Excel no backend (Supabase Edge Function): Adicionaria latência de rede e complexidade desnecessária para um arquivo de até 200 linhas.

**Conclusão**: `xlsx` oferece o melhor equilíbrio entre tamanho de bundle, funcionalidade e simplicidade para este caso de uso.

---

## Decision: Estratégia de Exportação PDF

**Decision**: Reutilizar a infraestrutura existente em `src/app/lib/dom-export.ts`.

**Rationale**:
- O projeto já possui um sistema robusto de exportação PDF via renderização DOM → Canvas → JPEG → PDF.
- A função `downloadElementAsPdf` aceita um `HTMLElement` e gera o PDF. Para listas de membros, será criado um elemento DOM oculto formatado como tabela/impressão e passado para essa função.
- O fallback de impressão (`printElementAsPdf`) já lida com iOS/Capacitor.
- Não é necessário introduzir `jsPDF`, `pdfmake` ou outra biblioteca PDF.

---

## Decision: Estrutura do Diálogo de Exportação

**Decision**: Componente `MemberExportDialog` usando `@radix-ui/react-dialog` (padrão shadcn/ui do projeto) com:
- Radio group para seleção de formato (PDF / Excel)
- Checkbox para "Agrupar por grupos de campo"
- Botões de ação: Confirmar / Cancelar

**Rationale**:
- Radix Dialog já é usado em todo o projeto (ex: `src/app/components/ui/dialog.tsx`).
- Radio group e checkbox também são componentes shadcn/ui disponíveis.
- Segue o princípio de consistência visual da constituição (tokens semânticos).

---

## Decision: Novo Campo de Permissão

**Decision**: Adicionar a permissão lógica `export_members` (ou `download_members` para manter consistência com `download_assignments`).

**Rationale**:
- O sistema usa `usePermissions.ts` com uma matriz de permissões por perfil.
- A exportação de membros é uma ação sensível (dados pessoais). Deve ser restrita.
- Perfis `coordenador` e `secretario` devem ter acesso por padrão; `designador` e `publicador` não.
- É necessário adicionar a coluna correspondente na tabela `role_permissions` do Supabase (ou usar fallback estático inicialmente).

**Nota**: O nome exato da permissão no banco de dados pode ser `can_export_members` seguindo o padrão `can_` das colunas existentes.
