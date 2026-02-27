# Design System - JW Gestao

## Objetivo

Este documento consolida a linguagem visual e os padroes de interface do aplicativo `JW Gestao`, com base na implementacao atual. Ele serve como referencia para manter consistencia entre telas, acelerar novas entregas e reduzir divergencias visuais.

## Direcao Visual

O produto adota uma linguagem:

- Clara e administrativa, com foco em legibilidade.
- Leve e acolhedora, evitando interfaces densas ou pesadas.
- Baseada em tons frios, com azul claro como cor de destaque.
- Voltada para produtividade em desktop, mas com adaptacao consistente para mobile.

## Tokens Fundamentais

Os tokens principais estao definidos em [src/styles/theme.css](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/styles/theme.css).

### Cores Base

- `--background: #f8fafc`
- `--foreground: #082c45`
- `--card: #ffffff`
- `--card-foreground: #082c45`
- `--muted: #f1f5f9`
- `--muted-foreground: #475569`
- `--border: #e2e8f0`

Essas cores formam a base da aplicacao: fundo claro, cartoes brancos, texto azul escuro e superficies secundarias em cinza-azulado muito suave.

### Cores de Destaque

- `--primary: #35bdf8`
- `--primary-foreground: #082c45`
- `--accent: #e0f2fe`
- `--accent-foreground: #0369a1`
- `--secondary: #c8d3df`
- `--secondary-foreground: #020513`

Uso recomendado:

- `primary`: CTA principal, icones de destaque, estados ativos e focos.
- `accent`: hover suave, avatares, chips informativos e realces secundarios.
- `secondary`: superfices auxiliares menos frequentes.

### Paleta Funcional

A interface atual usa cores semanticas aplicadas diretamente em classes utilitarias:

- Sucesso: verdes (`bg-green-50`, `text-green-700`, `bg-green-500`)
- Alerta: ambar/laranja (`bg-amber-50`, `text-amber-700`, `bg-amber-500`)
- Erro: vermelhos (`bg-red-50`, `text-red-500`)
- Informacao: azuis e cianos (`bg-sky-100`, `text-sky-700`, `bg-blue-500`)

Recomendacao:

- Manter verde para confirmacoes.
- Manter ambar para pendencias e avisos.
- Reservar vermelho para erro, exclusao e validacao invalida.

## Tipografia

As regras base tambem estao em [src/styles/theme.css](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/styles/theme.css).

### Escala

- Base global: `16px`
- `h1`: `text-2xl`
- `h2`: `text-xl`
- `h3`: `text-lg`
- `h4`, `label`, `button`, `input`: `text-base`

### Peso

- Titulos: `font-weight-medium`
- Botoes: `font-weight-medium`
- Campos: `font-weight-normal`
- Em telas de produto, aparecem tambem pesos `font-bold` para metricas, nomes e CTAs.

### Aplicacao Pratica

- Titulos de tela: `text-foreground`, hierarquia simples, sem excesso de peso.
- Labels auxiliares: `text-muted-foreground`.
- Numeros de KPI: `font-bold`, tamanho ampliado (`1.5rem` a `2rem`).
- Texto secundario: 0.75rem a 0.9rem em `text-muted-foreground`.

## Espacamento e Raios

### Espacamento

Padrao recorrente nas telas:

- Containers externos: `p-4` mobile, `md:p-6`
- Cartoes: `p-4`, `p-5` ou `p-6`
- Grids de cards: `gap-3`, `gap-4`, `gap-6`
- Formularios: `space-y-4`

### Raios

Padroes observados:

- Controles pequenos: `rounded-lg`
- Cards e modais: `rounded-xl`
- Destaques de login e CTA: `rounded-2xl`
- Avatares: `rounded-full`

Diretriz:

- Use `rounded-lg` para inputs, selects e botoes secundarios.
- Use `rounded-xl` para cards estruturais.
- Use `rounded-2xl` apenas em telas de entrada ou blocos hero.

## Elevacao e Bordas

### Bordas

- Borda padrao: `border border-border`
- Divisores internos: `border-b border-border`, `divide-y divide-border`

### Sombras

- Cards padrao: `shadow-sm`
- Hover de card: `hover:shadow-md`
- Destaque forte (login / CTA): `shadow-lg` ou sombra colorida leve

Diretriz:

- Priorizar borda + sombra sutil.
- Evitar sombras pesadas no fluxo administrativo principal.

## Layout

### Estrutura Principal

A shell principal esta em [src/app/components/Layout.tsx](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/app/components/Layout.tsx).

- Sidebar fixa em desktop (`w-64`)
- Overlay no mobile ao abrir navegacao
- Header superior simples
- Conteudo principal com scroll independente

### Sidebar

- Fundo escuro institucional: `bg-primary-foreground`
- Texto branco ou branco com opacidade
- Item ativo: `bg-primary text-primary-foreground`
- Hover de item inativo: translucido branco

Papel da sidebar:

- Navegacao primaria.
- Identidade da congregacao.
- Acesso ao perfil e logout.

### Conteudo

- Fundo global: `bg-background`
- Largura controlada por `max-w-*` quando a pagina pede leitura focada
- Grids responsivas com `grid-cols-1`, `md:grid-cols-*`, `lg:grid-cols-*`

## Componentes Base

### Cards

Padrao dominante:

- `bg-card`
- `rounded-xl`
- `border border-border`
- `shadow-sm`
- `overflow-hidden` quando ha cabecalho + conteudo

Variantes:

- Card de KPI: compacto, clicavel, com icone destacado.
- Card de lista: cabecalho com divisor e corpo com `divide-y`.
- Card de destaque: gradiente ou fundo escuro com alto contraste.

### Botoes

Padrao atual dividido em dois estilos.

Estilo tokenizado:

- Primario: `bg-primary text-primary-foreground`
- Secundario: `bg-card border border-border text-foreground`
- Ghost/link: hover em `bg-muted` ou `text-primary hover:underline`

Estilo legado hardcoded:

- CTA azul claro: `bg-[#35bdf8] text-[#082c45]`
- CTA escuro: `bg-[#082c45] text-white`

Diretriz:

- Para novas telas, preferir tokens (`bg-primary`, `text-primary-foreground`).
- Manter hex hardcoded apenas onde ja existe fluxo legado, ate refatoracao.

### Inputs e Selects

Padrao predominante:

- Fundo claro (`bg-gray-50` ou `bg-card`)
- `border border-gray-200` ou `border-border`
- `rounded-lg` ou `rounded-xl`
- Foco com `focus:ring-2 focus:ring-[#35bdf8]` ou `focus:ring-primary`

Diretriz:

- Consolidar progressivamente em tokens:
  `bg-card`, `border-border`, `focus:ring-primary`, `text-foreground`.

### Avatares

Padrao:

- Circulo com iniciais
- Fundo `bg-primary` ou `bg-accent`
- Texto `text-primary-foreground` ou `text-accent-foreground`
- Borda suave em `border-primary/10`

### Badges e Chips

Usados para:

- Permissoes
- Status
- Aprovacoes
- Tipos de reuniao

Padrao:

- Fundo claro semantico
- Texto de alto contraste da mesma familia de cor
- `rounded-full`
- Fonte pequena (`0.7rem` a `0.8rem`)

## Padroes por Tela

### Login

Referencia: [src/app/components/LoginPage.tsx](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/app/components/LoginPage.tsx)

- Fundo neutro limpo
- Bloco centralizado com `max-w-md`
- Identidade visual no topo
- Card de acesso com mais elevacao que o restante do app

Este e o unico ponto onde o uso de `rounded-2xl`, `shadow-lg` e maior foco visual faz sentido como padrao.

### Dashboard

Referencia: [src/app/components/Dashboard.tsx](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/app/components/Dashboard.tsx)

- KPIs em grid
- Listas em cards com cabecalho
- CTA rapidos em blocos coloridos/gradientes
- Mistura de informacao objetiva com navegacao contextual

### Membros

Referencia: [src/app/components/MembersList.tsx](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/app/components/MembersList.tsx)

- Alta densidade de informacao
- Formularios modais
- Secoes agrupadas por contexto (dados pessoais, familia, privilegios)
- Uso forte de chips para representar capacidades e autorizacoes

### Configuracoes

Referencia: [src/app/components/SettingsPage.tsx](/Users/giorgioderico/Library/Mobile%20Documents/com~apple~CloudDocs/Trabalho/Projetos%20AI/Jwgestao/src/app/components/SettingsPage.tsx)

- Estrutura em abas
- Cards para grupos
- Acoes de edicao em hover
- Fluxos de modal para criar, editar e excluir

## Iconografia

O app usa `lucide-react` como biblioteca principal.

Diretrizes:

- Tamanho padrao: `14`, `16`, `18`, `20`, `24`
- Icones sempre funcionais, sem excesso decorativo
- Usar cor herdada do contexto ou semantica do bloco

## Motion e Interacao

Padroes atuais:

- `transition-colors`
- `transition-all`
- `transition-opacity`
- `group-hover`
- Deslocamento de sidebar com `transform`

Diretriz:

- Animacoes devem ser curtas e discretas.
- Priorizar feedback de hover, foco e abertura de paineis.
- Evitar animacoes chamativas em contextos administrativos.

## Responsividade

Padroes existentes:

- `grid-cols-1` com expansao progressiva em `md` e `lg`
- Sidebar recolhida em mobile
- Densidade reduzida e empilhamento vertical em formularios e filtros

Diretriz:

- Mobile primeiro para modais e formularios.
- Desktop otimizado para produtividade e leitura comparativa.

## Acessibilidade

### Ja presente

- Contraste bom entre fundo e texto principal
- Estados de foco em inputs e botoes
- Labels visiveis na maioria dos campos
- Tamanho de clique adequado em botoes principais

### Melhorias recomendadas

- Padronizar foco com tokens em todos os formularios.
- Revisar textos com opacidade muito baixa na sidebar.
- Garantir consistencia de `aria-label` em botoes icon-only.

## Inconsistencias Atuais

O app hoje mistura dois estilos de implementacao:

- Estilo baseado em tokens (`bg-card`, `text-foreground`, `border-border`)
- Estilo hardcoded com hex (`#35bdf8`, `#082c45`, `#29abe2`)

Isso nao quebra a interface, mas aumenta custo de manutencao.

### Regra de Evolucao

- Novas interfaces devem priorizar tokens semanticos.
- Refatoracoes devem substituir hex duplicados por `primary`, `primary-foreground`, `accent` e `border`.
- Componentes de UI compartilhados devem ser a fonte principal de consistencia visual.

## Checklist Para Novas Telas

- Usar `bg-background` como base da pagina.
- Estruturar blocos com `bg-card`, `border-border`, `rounded-xl`, `shadow-sm`.
- Usar `text-foreground` para texto principal e `text-muted-foreground` para apoio.
- Aplicar `primary` apenas em acao, foco, estado ativo e destaque.
- Manter grids responsivos com quebra em `md` e `lg`.
- Evitar introduzir novas cores hardcoded sem necessidade real.

## Proximos Passos Recomendados

- Extrair variantes padrao de botao e input para componentes compartilhados.
- Substituir gradualmente classes hardcoded por tokens do tema.
- Formalizar uma biblioteca interna de patterns para KPI card, modal de formulario, tabela e badge semantica.

