# UI Contract: MemberExportDialog

## Component: MemberExportDialog

### Props Interface

```typescript
interface MemberExportDialogProps {
  /** Controla a visibilidade do diálogo */
  open: boolean;
  /** Callback para fechar o diálogo */
  onClose: () => void;
  /** Lista de membros a serem exportados (já filtrada) */
  members: MemberRow[];
  /** Lista de grupos de campo para lookup de nomes */
  groups: FieldServiceGroupRow[];
  /** Callback executado quando a exportação é confirmada */
  onExport: (options: ExportOptions) => void;
  /** Estado de carregamento durante a geração do arquivo */
  exporting: boolean;
}

interface ExportOptions {
  /** Formato do documento */
  format: 'pdf' | 'excel';
  /** Se true, agrupa os membros por grupo de campo */
  groupByFieldService: boolean;
}
```

### Behavior Contract

1. **Open/Close**: O diálogo é controlado externamente via `open`/`onClose`. Não gerencia seu próprio estado de visibilidade.
2. **Format Selection**: Deve haver um radio group com duas opções: PDF e Excel. PDF é o padrão selecionado.
3. **Grouping Option**: Uma checkbox "Agrupar por grupos de campo" deve estar disponível. Desmarcada por padrão.
4. **Confirm**: Ao confirmar, chama `onExport` com as opções selecionadas e fecha o diálogo.
5. **Cancel**: Ao cancelar, chama `onClose` sem gerar arquivo.
6. **Loading**: Quando `exporting` é `true`, os botões de ação devem estar desabilitados e mostrar indicador de carregamento.
7. **Accessibility**: Deve usar `Dialog` do Radix UI com `aria-label`, foco trap e fechamento via ESC.

### Visual Contract

- Container: `Dialog` com `bg-card`, `border-border`, `rounded-xl`, `shadow-lg`.
- Título: `text-lg font-medium text-foreground`.
- Conteúdo: `space-y-4` com labels em `text-sm text-muted-foreground`.
- Radio group: estilo shadcn/ui padrão (`RadioGroup` + `RadioGroupItem`).
- Checkbox: estilo shadcn/ui padrão (`Checkbox`).
- Botão Confirmar: `bg-primary text-primary-foreground rounded-lg`.
- Botão Cancelar: `bg-card border border-border text-foreground rounded-lg`.
