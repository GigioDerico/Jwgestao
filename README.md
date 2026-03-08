# JW Gestao

Sistema de apoio para organizacao interna de congregacoes das **Testemunhas de Jeova**.

O projeto foi pensado para ajudar irmaos responsaveis pela rotina congregacional a manterem, em um unico lugar, o cadastro de membros, a organizacao de reunioes, as designacoes e a geracao de escalas para consulta e impressao.

## PT-BR

### Para quem este projeto foi feito

O JW Gestao foi direcionado especialmente para:

- anciaos
- servos ministeriais
- irmaos que cuidam de designacoes
- irmaos envolvidos com audio e video
- irmaos que organizam saida de campo
- irmaos responsaveis pela escala do carrinho

Em vez de depender apenas de mensagens, papeis e planilhas separadas, o sistema centraliza essas informacoes em uma interface unica.

### O que o sistema faz

Hoje o aplicativo permite:

- cadastrar e editar membros da congregacao
- organizar dados de contato, grupo, familia e situacao espiritual
- consultar reunioes de meio de semana e fim de semana
- montar designacoes de reunioes
- montar escala de audio e video
- montar escala de saida de campo
- montar escala de carrinho
- notificar membros sobre designacoes
- confirmar recebimento de designacoes
- exportar escalas e quadros em `JPG` e `PDF`
- configurar permissoes de acesso por perfil

### Estrutura atual do app

As areas principais do sistema sao:

- `Dashboard`: visao geral, atalhos e minhas designacoes
- `Membros`: cadastro e manutencao dos membros
- `Reunioes`: consulta e exportacao de materiais
- `Designacoes > Reunioes`: montagem das partes das reunioes
- `Designacoes > Audio e Video`: escala tecnica mensal
- `Designacoes > Saida de Campo`: organizacao mensal da saida de campo
- `Designacoes > Carrinho`: escala mensal do carrinho
- `Configuracoes`: nome da congregacao, grupos e permissoes

### Principais recursos

- autenticacao por telefone e senha
- link de primeiro acesso e redefinicao com URL publica de producao
- controle de acesso por perfil
- notificacoes em tempo real
- exportacao pronta para compartilhamento e impressao
- uso responsivo no desktop e no celular
- suporte a recursos mobile com Capacitor e build Android assinada

### Status do projeto

O projeto esta em **desenvolvimento ativo** e ja cobre boa parte da rotina operacional de uma congregacao local.

O estado atual e:

- uso interno com foco pratico
- modulos principais ja funcionando
- documentacao base ja iniciada
- refinamentos frequentes de interface, exportacao e fluxos de escala
- build Android `release` ja configurada no projeto
- app web publicado em `https://jwgestao.vercel.app`

### Roadmap atual

Prioridades de evolucao mais naturais para o projeto:

1. adicionar gerenciamento de territorios
2. adicionar gerenciamento do ministerio de campo para publicadores
3. continuar refinando a experiencia mobile em todas as telas
4. ampliar a documentacao funcional e guias de treinamento
5. expandir regras e automacoes por tipo de designacao
8. incluir um histórico de partes feitas por membros com gráficos de participação
9. desenvolvimento e publicação de aplicativos nativos (Android e iOS) via Capacitor

### Executando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

3. Para gerar a build de producao:

```bash
npm run build
```

4. Para sincronizar a build web com o projeto Android:

```bash
npm run sync:android
```

5. Para gerar um APK Android `release` assinado:

```bash
npm run apk:release
```

Para garantir que o APK sempre seja gerado a partir da branch `main`, use:

```bash
npm run apk:main:debug
```

ou, para o build assinado:

```bash
npm run apk:main:release
```

Esses comandos falham automaticamente se a branch atual nao for `main`.

O comando valida o Java ativo antes de chamar o Gradle. Use um JDK entre `17` e `24`.

Antes do `APK release`, configure a assinatura em `android/keystore.properties` (arquivo local, nao versionado) com:

```properties
storeFile=app/jwgestao-release.keystore
storePassword=SEU_SEGREDO
keyAlias=jwgestao
keyPassword=SEU_SEGREDO
```

Como alternativa, use as variaveis de ambiente:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Se a assinatura nao estiver configurada, o Gradle interrompe qualquer tarefa `release`.

### URL publica de producao

O app web publicado atualmente usa:

- `https://jwgestao.vercel.app`

Essa URL e usada como base publica para:

- links de primeiro acesso de membros
- links de redefinicao de senha
- redirecionamentos de autenticacao quando o app estiver rodando no Android via Capacitor

### Documentacao

Documentos principais do projeto:

- [Visao Geral do App](docs/app-overview.md)
- [Guia de Uso](docs/user-guide.md)
- [Esquema de Banco](docs/database-schema.md)

### Objetivo do projeto

O foco do JW Gestao e facilitar a organizacao congregacional com mais clareza, menos retrabalho e melhor visibilidade das designacoes.

E um projeto voltado para o uso pratico no dia a dia, especialmente em rotinas que exigem rapidez, revisao e compartilhamento de escalas entre irmaos responsaveis.

---

## EN

### What this project is

JW Gestao is an internal support system for organizing local congregation routines for **Jehovah's Witnesses**.

It was designed to help brothers responsible for congregation operations keep member records, meeting organization, assignments, and printable schedules in one place.

### Who this project is for

This project is especially aimed at:

- elders
- ministerial servants
- brothers handling meeting assignments
- brothers serving in audio and video
- brothers organizing field service schedules
- brothers responsible for cart scheduling

Instead of relying only on scattered messages, paper notes, or spreadsheets, the system centralizes these workflows in one interface.

### What the app currently does

The current application can:

- create and edit congregation member records
- organize contact, group, family, and spiritual status data
- manage midweek and weekend meeting information
- manage meeting assignments
- manage audio and video schedules
- manage field service schedules
- manage cart schedules
- notify members about assignments
- allow members to confirm assignment receipt
- export schedules in `JPG` and `PDF`
- manage access permissions by role

### Current app structure

The main areas of the system are:

- `Dashboard`: overview, shortcuts, and personal assignments
- `Members`: member records and maintenance
- `Meetings`: meeting review and exports
- `Assignments > Meetings`: detailed meeting assignment management
- `Assignments > Audio and Video`: monthly technical scheduling
- `Assignments > Field Service`: monthly field service scheduling
- `Assignments > Cart`: monthly cart scheduling
- `Settings`: congregation name, groups, and permissions

### Key features

- phone-and-password authentication
- first-access and password-reset links using the public production URL
- role-based access control
- real-time notifications
- export-ready materials for sharing and printing
- responsive desktop and mobile usage
- mobile support through Capacitor with signed Android release builds

### Project status

The project is in **active development** and already covers a large part of the day-to-day operational routine of a local congregation.

Current status:

- practical internal-use focus
- core modules already working
- foundational documentation in place
- ongoing refinement of UI, exports, and scheduling flows
- Android `release` builds are already configured in the project
- the web app is currently live at `https://jwgestao.vercel.app`

### Current roadmap

The most natural next priorities are:

1. add territory management
2. add field ministry management for publishers
3. keep improving the mobile experience across all screens
4. expand functional documentation and training material
5. extend rules and automation for each assignment type
6. add a participation history for member assignments with engagement charts
7. develop and publish native mobile applications (Android and iOS) via Capacitor

### Running locally

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Sync the web build into the Android project:

```bash
npm run sync:android
```

5. Generate a signed Android `release` APK:

```bash
npm run apk:release
```

The command validates the active Java runtime before invoking Gradle. Use a JDK between `17` and `24`.

Before running the `release` build, configure signing in `android/keystore.properties` (local, not committed) with:

```properties
storeFile=app/jwgestao-release.keystore
storePassword=YOUR_SECRET
keyAlias=jwgestao
keyPassword=YOUR_SECRET
```

You can also provide the same values through these environment variables:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

If signing is missing, Gradle will fail any `release` task on purpose.

### Public production URL

The current live web app runs at:

- `https://jwgestao.vercel.app`

This public URL is used as the canonical base for:

- member first-access links
- password reset links
- auth redirects when the app is running inside the Android Capacitor shell

### Documentation

Main project documents:

- [App Overview](docs/app-overview.md)
- [User Guide](docs/user-guide.md)
- [Database Schema](docs/database-schema.md)

### Project goal

The goal of JW Gestao is to make congregation organization clearer, faster, and easier to maintain, with less rework and better visibility over assignments.

It is a practical day-to-day tool, especially for workflows that require quick review, schedule adjustments, and easy sharing of finalized materials.
