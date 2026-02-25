# JW Congregation Manager

## Objetivo

Sistema para gestão de congregação, controle de membros e organização automatizada de designações de reuniões com controle de acesso por cargos.

## Telas

### Login e Autenticação

**Rota:** `/`

**Objetivo:** Realizar o acesso seguro ao sistema com base no perfil do usuário.

**Componentes:**

- **Input de Credenciais e Botão Entrar**: Encaminha para /dashboard após validação das credenciais.
- **Link de Cadastro de Membro**: Abre formulário para solicitação de acesso à congregação.

### Dashboard Principal

**Rota:** `/dashboard`

**Objetivo:** Visão geral das atividades da congregação e atalhos rápidos.

**Componentes:**

- **Cards de Atalhos Rápidos (Membros, Reuniões, Designações)**: Redireciona para telas específicas de membros ou reuniões.
- **Widget de Minhas Designações**: Exibe as próximas partes do usuário logado na reunião atual.

### Lista de Membros

**Rota:** `/members`

**Objetivo:** Visualizar e filtrar todos os membros, estudantes e publicadores.

**Componentes:**

- **Filtros de Busca e Situação Espiritual**: Abre filtros por situação espiritual e cargos.
- **Tabela/Lista de Membros**: Exibe a lista de pessoas com resumo de informações.
- **Botão Adicionar Novo Membro**: Redireciona para /members/new.

### Cadastro e Edição de Membro

**Rota:** `/members/:id`

**Objetivo:** Gerenciar informações detalhadas e situação espiritual de uma pessoa.

**Componentes:**

- **Formulário de Dados Pessoais e Espirituais**: Salva ou atualiza os dados do membro, incluindo contato de emergência.
- **Seletor de Cargos e Responsabilidades**: Define se o membro é Ancião, Servo, Pioneiro, etc.

### Designação de Reunião

**Rota:** `/meetings/:id/assignments
`

**Objetivo:** Atribuir partes e tarefas para as reuniões de meio de semana e fim de semana, com campos que se adaptam conforme a estrutura da semana selecionada.


**Componentes:**

- **Seletor de Data e Tipo de Reunião**: Altera a semana sendo visualizada; ajusta dinamicamente os campos de designação conforme o tipo de reunião (Meio de Semana ou Fim de Semana).
- **Seção de Reunião Pública**: Permite selecionar o orador e o presidente para o discurso público.
- **Seção de Estudo de A Sentinela**: Permite designar o dirigente e o leitor do estudo.
- **Seção Vida e Ministério: Tesouros da Palavra de Deus**: Permite designar irmãos para o Tesouros da Palavra de Deus, Joias Espirituais e Leitura da Bíblia.
- **Seção Vida e Ministério: Faça seu Melhor no Ministério**: Permite selecionar estudantes e ajudantes para as partes de demonstração.
- **Seção Vida e Ministério: Nossa Vida Cristã**: Designação de partes locais, Necessidades da Congregação e Estudo Bíblico de Congregação.
- **Botão Salvar Designações**: Salva todas as atribuições feitas para a data selecionada.
- **Botão Gerar Quadro de Anúncios**: Gera um PDF ou link para compartilhamento das designações.

### Configurações de Acesso (RBAC)

**Rota:** `/settings/permissions`

**Objetivo:** Gerenciar o que cada cargo (Ancião, Secretário) pode visualizar ou editar.

**Componentes:**

- **Matriz de Permissões por Função**: Atualiza as permissões de acesso baseadas no cargo espiritual.

## Personas

### Coordenador (Administrador)

Responsável pela gestão completa da congregação e controle de acessos. Possui visão total dos membros e define as regras de permissão do sistema.

**User Stories:**

- Como Coordenador (Administrador), eu quero Configurar a matriz de permissões por função para garantir que cada irmão acesse apenas o que é pertinente ao seu cargo
- Como Coordenador (Administrador), eu quero Visualizar o dashboard principal com métricas gerais para acompanhar a saúde espiritual da congregação
- Como Coordenador (Administrador), eu quero Gerenciar dados sensíveis e cargos de todos os membros para manter o registro congregacional atualizado

### Secretário (Operador)

Focado na organização administrativa, cadastro de membros e manutenção da lista de publicadores e estudantes.

**User Stories:**

- Como Secretário (Operador), eu quero Filtrar a lista de membros por situação espiritual para gerar relatórios de atividade rapidamente
- Como Secretário (Operador), eu quero Cadastrar novos membros e estudantes no sistema para manter o banco de dados organizado
- Como Secretário (Operador), eu quero Atualizar informações de contato de emergência e cargos para garantir a segurança e organização dos irmãos

### Ajudante de Reuniões (Designador)

Responsável pela escala das reuniões, cuidando para que as designações sejam distribuídas de forma justa e organizada.

**User Stories:**

- Como Ajudante de Reuniões (Designador), eu quero Utilizar a sugestão inteligente de designados para escalar membros que não tiveram partes recentemente de forma justa
- Como Ajudante de Reuniões (Designador), eu quero Salvar a escala da reunião e notificar os envolvidos para garantir que todos estejam cientes de suas designações
- Como Ajudante de Reuniões (Designador), eu quero Visualizar o widget de próximas designações para confirmar quem são os oradores e leitores da semana

### Publicador (Usuário Comum)

Membro da congregação que acessa o sistema para consultar suas próprias atividades e informações básicas.

**User Stories:**

- Como Publicador (Usuário Comum), eu quero Acessar o widget 'Minhas Designações' no dashboard para se preparar com antecedência para suas partes na reunião
- Como Publicador (Usuário Comum), eu quero Solicitar acesso à congregação através do link de cadastro para poder interagir com o sistema
- Como Publicador (Usuário Comum), eu quero Visualizar seus próprios dados no perfil para garantir que suas informações de contato estejam corretas

## Banco de Dados

### members

Tabela para armazenar informações detalhadas dos membros da congregação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | pk | - |
| full_name | text | - |
| email | text | - |
| phone | text | - |
| emergency_contact_name | text | - |
| emergency_contact_phone | text | - |
| spiritual_status | text | - |

### member_roles

Tabela para associar cargos e responsabilidades aos membros.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | pk | - |
| member_id | fk | - |
| role | text | - |

### permissions

Tabela para definir as permissões de acesso associadas a cada cargo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | pk | - |
| role | text | - |
| permissions | jsonb | - |

### meeting_designations

Tabela para armazenar as designações de partes e tarefas para as reuniões.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | pk | - |
| meeting_date | timestamp | - |
| meeting_type | text | - |
| public_talk_speaker_id | fk | - |
| public_talk_chairman_id | fk | - |
| watchtower_study_conductor_id | fk | - |
| watchtower_study_reader_id | fk | - |
| treasures_word_of_god_ 1_id | fk | - |
| spiritual_gems_ 1_id | fk | - |
| bible_reading_id | fk | - |
| ministry_school_part_1_id | fk | - |
| ministry_school_part_2_id | fk | - |
| ministry_school_assistant_id | fk | - |
| christian_life_local_part_id | fk | - |
| christian_life_congregation_bible_study_conductor_id | fk | - |

### users

Tabela para armazenar informações de login dos usuários.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | pk | - |
| member | undefined | - |

