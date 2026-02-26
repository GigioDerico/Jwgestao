🤖 **Applying knowledge of `@[database-architect]`...**

# Documento de Arquitetura de Banco de Dados: JW Gestão

Este documento descreve o modelo relacional de Banco de Dados idealizado para o projeto **JW Gestão** (organização congregacional), projetado assumindo um ambiente PostgreSQL (Supabase / Neon), focado em normalização, integridade referencial, e consultas otimizadas para as visualizações já desempenhadas pelo Front-End.

---

## 1. Topologia e Visão Geral

O projeto baseia-se num sistema relacional direto, com três eixos focais:
1. **Pessoas e Permissões** (Membros, Grupos e Autenticação Auth).
2. **Reuniões do Meio de Semana** (Vida e Ministério e suas múltiplas partes aninhadas).
3. **Reuniões do Fim de Semana** (Discurso Público e A Sentinela).

---

## 2. Tipos e Enums Customizados (Types)

Para garantir integridade profunda do lado do banco (não aceitando strings livres onde o domínio é restrito), definiremos `ENUMs` no PostgreSQL:

```sql
CREATE TYPE spiritual_status_enum AS ENUM (
  'publicador', 'publicador_batizado', 'pioneiro_auxiliar', 'pioneiro_regular', 'estudante'
);

CREATE TYPE gender_enum AS ENUM ('M', 'F');

CREATE TYPE system_role_enum AS ENUM (
  'coordenador', 'secretario', 'designador', 'publicador'
);

CREATE TYPE member_role_enum AS ENUM (
  'anciao', 'servo_ministerial'
);
```

---

## 3. Estrutura de Tabelas (Esquema Físico)

### Eixo 1: Membros e Organização
Toda a escala da congregação é guiada através do cadastro limpo de publicadores e seus grupos de campo.

#### Tabela `field_service_groups`
Armazena os grupos de saída de campo (Ex: Grupo 1 - Sede).
* `id` (UUID, Primary Key)
* `name` (VARCHAR 100, NOT NULL)
* `overseer_id` (UUID, Foreign Key para `members`, pode ser nullable por interdependência na criação)
* `created_at` (TIMESTAMPTZ)

#### Tabela `members`
Tabela central de cadastro de todas as pessoas, incluindo seu status e vínculos familiares.
* `id` (UUID, Primary Key)
* `full_name` (VARCHAR 255, NOT NULL)
* `email` (VARCHAR 255, UNIQUE)
* `phone` (VARCHAR 30)
* `emergency_contact_name` (VARCHAR 255)
* `emergency_contact_phone` (VARCHAR 30)
* `spiritual_status` (spiritual_status_enum, DEFAULT 'publicador')
* `gender` (gender_enum, NOT NULL)
* `group_id` (UUID, Foreign Key para `field_service_groups`)
* `is_family_head` (BOOLEAN, DEFAULT FALSE)
* `family_head_id` (UUID, Foreign Key auto-referenciada para `members(id)`)
* `avatar_url` (TEXT)
* **Permissões de Escala (Booleans otimizadas em vez de arrays complexos):**
  * `approved_audio_video` (BOOLEAN, DEFAULT FALSE)
  * `approved_indicadores` (BOOLEAN, DEFAULT FALSE)
  * `approved_carrinho` (BOOLEAN, DEFAULT FALSE)
* `created_at` (TIMESTAMPTZ)

#### Tabela de Junção `member_privileges` (Cargos Religiosos)
Como um membro pode não ter cargo ou acumular cargo temporário normalizado (Ancião + Pioneiro, focado em cargos estruturais do `member_role_enum`).
* `member_id` (UUID, FK para `members`)
* `role` (member_role_enum)
* _Primary Key (member_id, role)_

#### Tabela `user_profiles`
Relaciona o `id` da tabela de Autenticação Segura (Supabase Auth `auth.users`) ao seu perfil de operação dentro do software (Quem é secretário, designador, etc).
* `id` (UUID, Primary Key, Foreign Key conectada à `auth.users.id`)
* `member_id` (UUID, Foreign Key para `members`)
* `system_role` (system_role_enum, NOT NULL) - Define acesso às páginas de edições da agenda.

---

### Eixo 2: Reuniões (Meetings)
Ao se projetar a base, separamos as características específicas de Vida e Ministério das peculiaridades do Final de Semana para que o banco preencha campos fixos eficientemente de acordo com as especificações exigidas pelo arquivo de dados do sistema.

#### Tabela `midweek_meetings` (Vida e Ministério)
* `id` (UUID, Primary Key)
* `date` (DATE, UNIQUE, INDEX)
* `bible_reading` (VARCHAR 150)
* `president_id` (UUID, FK -> `members`)
* `opening_prayer_id` (UUID, FK -> `members`)
* `closing_prayer_id` (UUID, FK -> `members`)
* `opening_song` (INTEGER)
* `middle_song` (INTEGER)
* `closing_song` (INTEGER)

**Bloco Tesouros da Bíblia (Normalizado diretamente na mesma tabela, pois são colunas imutáveis fixas):**
* `treasure_talk_title` (VARCHAR 255)
* `treasure_talk_speaker_id` (UUID, FK -> `members`)
* `treasure_gems_speaker_id` (UUID, FK -> `members`)
* `treasure_reading_student_id` (UUID, FK -> `members`)
* `treasure_reading_room` (VARCHAR 100)

**Bloco Estudo Bíblico da Congregação:**
* `cbs_conductor_id` (UUID, FK -> `members`)
* `cbs_reader_id` (UUID, FK -> `members`)

#### Tabela `midweek_ministry_parts` (Partes Dinâmicas - Faça seu Melhor no Ministério)
Como estas partes podem variar entre 3 a 5 apresentações e o número depende da semana:
* `id` (UUID, Primary Key)
* `meeting_id` (UUID, FK -> `midweek_meetings` ON DELETE CASCADE)
* `part_number` (INTEGER)
* `title` (VARCHAR 255)
* `duration` (INTEGER)     -- em minutos
* `student_id` (UUID, FK -> `members`)
* `assistant_id` (UUID, FK -> `members`, NULLABLE)
* `room` (VARCHAR 50)      -- ex: 'Salão principal', 'Sala B'

#### Tabela `midweek_christian_life_parts` (Partes Dinâmicas - Nossa Vida Cristã)
* `id` (UUID, Primary Key)
* `meeting_id` (UUID, FK -> `midweek_meetings` ON DELETE CASCADE)
* `part_number` (INTEGER)
* `title` (VARCHAR 255)
* `duration` (INTEGER)
* `speaker_id` (UUID, FK -> `members`)

---

#### Tabela `weekend_meetings` (Discurso Público e Sentinela)
* `id` (UUID, Primary Key)
* `date` (DATE, UNIQUE, INDEX)
* `president_id` (UUID, FK -> `members`)
* `closing_prayer_id` (UUID, FK -> `members`)

**Discurso Público:**
* `talk_theme` (VARCHAR 255)
* `talk_speaker_name` (VARCHAR 255, NOT NULL) _(Mantido como texto simples porque o orador recorrentemente é um visitante externo e não terá UUID na tabela interna de membros)._
* `talk_congregation` (VARCHAR 150)

**A Sentinela:**
* `watchtower_conductor_id` (UUID, FK -> `members`)
* `watchtower_reader_id` (UUID, FK -> `members`)

---

## 4. Estratégia de Índices (Query Optimization)

1. `CREATE INDEX idx_members_name ON members USING btree (full_name);` _(Busca textual constante na listagem)_
2. `CREATE INDEX idx_members_group ON members (group_id);` _(Filtros cruzados entre grupos e publicadores)_
3. `CREATE INDEX idx_midweek_date ON midweek_meetings (date);` _(A Dashboard sempre foca o carregamento limitando consultas por `date >= CURRENT_DATE`)_
4. `CREATE INDEX idx_weekend_date ON weekend_meetings (date);` _(A mesma regra retroativa de performance de listagem se aplica)_

## 5. Justificativas Arquiteturais de Normalização
1. **Separação de Vida/Ministério vs Final de Semana:** Fundir ambas numa tabela genérica de reuniões geraria dezenas de colunas baseadas em "NULOS" agressivos. A separação mantém as restrições mais robustas, tornando as cláusulas de consulta infinitamente mais limpas.
2. **Uso intenso de Chaves Estrangeiras sobre Strings:** No TypeScript atual (`mockData.ts`), o presidente é passado por Nome Completo livre. No esquema arquitetural Postgres correto, transformamos as designações em associações estritas sob Chaves Estrangeiras de Publicadores `UUID, FK -> members`.
3. **Chefe de Família Auto-Referenciado:** O laço de dependência `family_head_id -> members(id)` permite realizar agregações recursivas de grupos familiares (`JOIN members parent ON parent.id = child.family_head_id`) em uma única query otimizada.
