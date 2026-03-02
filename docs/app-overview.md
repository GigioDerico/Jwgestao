# JW Gestao - Visao Geral do Aplicativo

## 1. O que e o JW Gestao

O **JW Gestao** e um sistema interno para organizacao de uma congregacao local. O aplicativo centraliza cadastro de membros, reunioes, designacoes e configuracoes operacionais em uma unica interface, com foco em uso rapido no desktop e no celular.

O objetivo principal e reduzir controles dispersos em papel, mensagens e planilhas, deixando a rotina administrativa e de designacao mais organizada, visual e facil de acompanhar.

---

## 2. Para que o sistema e usado

Hoje o aplicativo atende principalmente estas necessidades:

- cadastro e manutencao dos membros da congregacao
- controle de informacoes espirituais e organizacionais de cada membro
- consulta e acompanhamento das reunioes de meio de semana e fim de semana
- montagem e edicao de designacoes por tipo de servico
- notificacao de membros sobre designacoes recebidas
- confirmacao de recebimento das designacoes pelo proprio membro
- exportacao de escalas e quadros em **JPG** e **PDF**
- administracao de permissoes por funcao e configuracoes locais da congregacao

---

## 3. Perfil de usuarios e acesso

O sistema trabalha com autenticacao e controle de acesso por perfil.

### Autenticacao

- O login e feito por **telefone + senha**.
- Internamente, o telefone e convertido para um identificador de autenticacao baseado em email.
- A sessao e restaurada automaticamente quando o usuario volta ao app.

### Perfis do sistema

Os perfis atualmente considerados no controle de permissao sao:

- `coordenador`
- `secretario`
- `designador`
- `publicador`

O perfil `coordenador` atua como perfil com acesso total. Os demais perfis usam uma matriz de permissoes configuravel, com defaults de fallback quando necessario.

---

## 4. Stack e arquitetura atual

O aplicativo atual foi construido com uma stack web moderna, com suporte a uso mobile.

- **Frontend:** React 18
- **Build e dev server:** Vite
- **Linguagem:** TypeScript
- **Roteamento:** React Router
- **Estilizacao:** Tailwind CSS
- **Componentes de interface:** combinacao de componentes proprios com Radix UI e Material UI em pontos especificos
- **Backend/Banco/Auth:** Supabase
- **Recursos nativos mobile:** Capacitor
- **Deploy web atual:** Vercel (`https://jwgestao.vercel.app`)

### Integracoes em uso

- **Supabase Auth:** autenticacao e sessao
- **Supabase Database:** persistencia de membros, reunioes, designacoes, grupos, permissoes e notificacoes
- **Supabase Storage:** upload e remocao de avatar do usuario
- **Capacitor Geolocation:** permissao de localizacao
- **Capacitor Push Notifications:** permissao de notificacoes push

---

## 5. Estrutura de navegacao

Depois do login, o usuario entra em um layout autenticado com menu lateral e barra superior.

As rotas principais atualmente sao:

- `/dashboard`
- `/members`
- `/meetings`
- `/assignments/meetings`
- `/assignments/audio-video`
- `/assignments/field-service`
- `/assignments/cart`
- `/settings`

O menu **Designacoes** e um grupo com submenu, separado por tipo de designacao. Isso permite que cada area tenha sua propria tela e evolua com regras especificas.

---

## 6. Modulos principais do aplicativo

### 6.1 Dashboard

O dashboard e a visao geral do sistema para o usuario autenticado.

Principais funcoes:

- exibicao de indicadores rapidos para usuarios com permissao
- resumo de membros cadastrados
- contagem de reunioes cadastradas
- destaque de membros com privilegios especificos, como anciaos
- secao **Minhas Designacoes**, mostrando ao usuario logado as proximas designacoes dele
- acao de confirmacao de designacoes diretamente do dashboard
- atalhos rapidos para areas operacionais

O dashboard combina visao administrativa com uma visao pessoal, para que o publicador tambem consiga ver o que foi designado para ele.

### 6.2 Membros

O modulo de membros e a base cadastral do sistema.

Ele permite:

- listar todos os membros cadastrados
- buscar por nome
- filtrar por situacao espiritual
- filtrar por grupo de campo
- alternar modo de visualizacao entre lista, agrupado por grupo de campo e agrupado por familia
- cadastrar novo membro
- editar membro existente

#### Informacoes mantidas no cadastro

O cadastro atual contem, entre outros:

- nome completo
- telefone
- email
- situacao espiritual
- genero
- grupo de campo
- organizacao familiar
- privilegios e aprovacoes internas
- perfil de sistema
- contato de emergencia

#### Endereco estruturado

O fluxo atual de criacao e edicao de membros tambem inclui endereco estruturado, com estes campos:

- rua/logradouro
- numero
- bairro
- cidade
- estado (UF)
- CEP

Esses dados sao persistidos no banco e aparecem nos formularios de cadastro e edicao, mas nao sao exibidos na listagem principal nesta etapa.

### 6.3 Reunioes

O modulo de reunioes e a area de consulta e acompanhamento das reunioes da congregacao.

Ele trabalha com dois grupos principais:

- **Meio de semana**
- **Fim de semana**

Principais funcoes:

- visualizar reunioes cadastradas
- alternar entre os tipos de reuniao
- consultar detalhes das partes e responsaveis
- gerar documentos de impressao/exportacao
- exportar em **JPG** e **PDF**
- usar visualizacao mobile dedicada para reunioes de meio de semana no celular, sem alterar a folha de impressao do desktop

Essa tela serve como area de visualizacao e saida de material. As designacoes detalhadas ficam separadas em modulos especificos.

### 6.4 Designacoes de Reunioes

A rota `/assignments/meetings` concentra as designacoes ligadas as reunioes congregacionais.

Principais funcoes:

- gerenciar designacoes de reunioes de meio de semana e fim de semana
- criar ou editar registros completos de reuniao
- definir horarios, canticos e estrutura da reuniao
- preencher partes do bloco de meio de semana
- preencher partes do fim de semana
- editar designacoes ja existentes por modal

Este modulo cobre o fluxo mais detalhado de escalas da reuniao, incluindo distribuicao de partes e responsaveis.

### 6.5 Designacoes de Audio e Video

A rota `/assignments/audio-video` e dedicada a escala tecnica das reunioes.

Principais funcoes:

- gerar a estrutura do mes com base nas datas reais de reuniao
- criar e editar a escala por data
- preencher funcoes tecnicas como som, imagem, palco, microfone 1, microfone 2 e entradas/auditorio
- evitar repeticao indevida da mesma pessoa em funcoes restritas no mesmo dia
- exportar a escala do mes em **JPG** e **PDF**

Quando o mes ja foi totalmente gerado, a interface oculta a secao de geracao mensal e passa a exibir apenas a manutencao da escala.

### 6.6 Designacoes de Saida de Campo

A rota `/assignments/field-service` organiza a escala mensal de saida de campo.

Categorias atualmente trabalhadas:

- Terca-feira
- Quarta-feira
- Sexta-feira
- Sabado
- Sabado - Rural
- Domingo

Principais funcoes:

- gerar a estrutura mensal da escala
- preencher responsavel, horario e local
- adicionar linhas extras para grupos de domingo
- adicionar linhas extras para sabado rural
- ajustar visual de impressao para caber a escala e o quadro final
- exportar em **JPG** e **PDF**

Assim como em outros modulos mensais, quando o mes ja estiver completamente estruturado, a secao de geracao deixa de aparecer.

### 6.7 Designacoes de Carrinho

A rota `/assignments/cart` controla a escala mensal do carrinho.

Principais funcoes:

- organizar designacoes por semana dentro do mes
- cadastrar linhas manuais da escala
- definir dia, dia da semana, horario, local, publicador 1 e publicador 2
- editar designacoes existentes
- exibir em formato de tabela no desktop
- exibir em formato de cards no mobile
- exportar em **JPG** e **PDF**

O modulo tambem recebeu ajustes visuais de legibilidade, com linhas divisorias mais claras entre registros e cabecalho proprio na visualizacao mobile.

### 6.8 Configuracoes

O modulo de configuracoes centraliza as definicoes administrativas do sistema.

Principais funcoes:

- definir o nome da congregacao
- gerenciar a matriz de permissoes por perfil
- editar o que cada perfil pode visualizar ou alterar
- criar grupos de saida de campo
- editar grupos de saida de campo
- remover grupos de saida de campo
- definir dirigente e ajudante dos grupos

Essa area e essencial para adaptar o aplicativo a realidade local da congregacao sem depender de mudancas no codigo para cada ajuste operacional.

---

## 7. Notificacoes e confirmacoes

O sistema possui uma camada de notificacoes voltada principalmente para designacoes.

---

## 8. Acesso inicial e links publicos

O acesso continua sendo feito por **telefone + senha**, mas o fluxo operacional de criacao e recuperacao agora considera explicitamente a URL publica do sistema.

### Como o primeiro acesso funciona hoje

- ao criar um membro com acesso, o sistema gera um link de primeiro acesso
- ao regenerar o acesso, o sistema revoga a senha anterior e gera um novo link
- esses links apontam para a aplicacao publicada em `https://jwgestao.vercel.app`

Isso evita que links de autenticacao apontem para `localhost` quando o sistema estiver rodando dentro do app Android com Capacitor.

### Build mobile atual

O projeto ja possui:

- configuracao de assinatura Android para build `release`
- fluxo de `sync` do Capacitor com a build web
- geracao de APK assinado a partir do codigo atual

Recursos atuais:

- carregamento de notificacoes ligadas ao membro logado
- atualizacao em tempo real via subscription
- marcacao individual como lida
- marcacao de todas como lidas
- confirmacao de recebimento da designacao

Essas notificacoes aparecem na interface autenticada e tambem reforcam o fluxo de acompanhamento pessoal de responsabilidades.

---

## 8. Perfil do usuario

O app possui uma area de perfil acessivel a partir do layout principal.

Nessa area, o usuario pode:

- visualizar dados basicos do proprio perfil
- atualizar informacoes pessoais disponiveis
- enviar avatar
- remover avatar
- conceder ou revisar permissoes nativas do dispositivo

Isso permite que a experiencia do usuario seja mais completa, inclusive em ambiente mobile instalado via Capacitor.

---

## 9. Exportacao, impressao e uso mobile

Uma parte importante do app e a geracao de materiais prontos para consulta e impressao.

### Exportacoes

Atualmente, modulos como reunioes e designacoes conseguem gerar:

- **JPG**, usando um renderizador proprio para converter a interface em imagem
- **PDF**, com suporte a exportacao e fluxo de impressao

Esse recurso foi ajustado para evitar problemas comuns de exportacao de canvas em navegadores e manter melhor previsibilidade visual.

### Uso mobile

O sistema foi pensado para funcionar bem em telas menores:

- layouts responsivos
- cards especificos em telas mobile quando necessario
- integracao com recursos nativos por Capacitor

Na pratica, isso permite consulta e operacao tanto no computador quanto no celular, inclusive em atividades do dia a dia da congregacao.

---

## 10. Estrutura funcional resumida

Em termos práticos, o fluxo atual do aplicativo e:

1. o usuario entra com telefone e senha
2. o sistema identifica o membro vinculado e o perfil de acesso
3. o menu e ajustado conforme as permissoes
4. o usuario consulta dashboard, membros, reunioes ou designacoes
5. as escalas podem ser editadas e exportadas
6. os membros designados recebem notificacoes e podem confirmar recebimento

---

## 11. Escopo atual do produto

No estado atual, o JW Gestao ja cobre bem as rotinas centrais de:

- cadastro congregacional
- organizacao de reunioes
- distribuicao de designacoes
- configuracao administrativa
- exportacao de escalas

O sistema esta estruturado de forma modular, com cada tipo de designacao em sua propria pagina, o que facilita manutencao, crescimento de funcionalidades e ajustes especificos por area.

Essa separacao e um dos pontos mais importantes da arquitetura funcional atual do aplicativo.
