-- Backfill de privilégios de reunião com base no histórico do último ano
-- Período: 2025-03-27 a 2026-03-27
-- Preenche os campos approved_* dos membros com base nas designações já realizadas.
--
-- Mapeamento de papéis → privilégios:
--   approved_presidente_reuniao  ← midweek.president_id, weekend.president_id
--   approved_oracao              ← midweek.opening_prayer_id, midweek.closing_prayer_id, weekend.closing_prayer_id
--   approved_leitura_biblica     ← midweek.treasure_reading_student_id
--   approved_discurso_sala       ← midweek.treasure_talk_speaker_id, midweek.treasure_gems_speaker_id,
--                                   midweek_christian_life_parts.speaker_id,
--                                   midweek_ministry_parts.student_id (sem assistente)
--   approved_demonstracao        ← midweek_ministry_parts.student_id (com assistente),
--                                   midweek_ministry_parts.assistant_id
--   approved_estudo_biblico      ← midweek.cbs_conductor_id
--   approved_leitor_estudo_biblico ← midweek.cbs_reader_id
--   approved_leitor_atalaia      ← weekend.watchtower_reader_id
--
-- Nota: approved_discurso_publico não é populado automaticamente pois o orador
-- de discurso público é armazenado apenas como texto (talk_speaker_name), sem vínculo a um member_id.

with

-- Papéis da reunião de meio de semana (tabela principal)
midweek_main_roles as (
  select
    president_id as member_id,
    true  as has_presidente,
    false as has_oracao,
    false as has_leitura,
    false as has_discurso,
    false as has_demonstracao,
    false as has_estudo,
    false as has_leitor_estudo,
    false as has_leitor_atalaia
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and president_id is not null

  union all

  select opening_prayer_id, false, true, false, false, false, false, false, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and opening_prayer_id is not null

  union all

  select closing_prayer_id, false, true, false, false, false, false, false, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and closing_prayer_id is not null

  union all

  -- Leitura bíblica
  select treasure_reading_student_id, false, false, true, false, false, false, false, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and treasure_reading_student_id is not null

  union all

  -- Discurso do tesouro
  select treasure_talk_speaker_id, false, false, false, true, false, false, false, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and treasure_talk_speaker_id is not null

  union all

  -- Joias espirituais
  select treasure_gems_speaker_id, false, false, false, true, false, false, false, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and treasure_gems_speaker_id is not null

  union all

  -- Condutor do CBS
  select cbs_conductor_id, false, false, false, false, false, true, false, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and cbs_conductor_id is not null

  union all

  -- Leitor do CBS
  select cbs_reader_id, false, false, false, false, false, false, true, false
  from public.midweek_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and cbs_reader_id is not null
),

-- Partes do ministério (Faça sua Melhor Parte)
ministry_parts_roles as (
  -- Estudante em demonstração (com assistente) → approved_demonstracao
  select
    mp.student_id as member_id,
    false as has_presidente,
    false as has_oracao,
    false as has_leitura,
    false as has_discurso,
    true  as has_demonstracao,
    false as has_estudo,
    false as has_leitor_estudo,
    false as has_leitor_atalaia
  from public.midweek_ministry_parts mp
  join public.midweek_meetings mm on mp.meeting_id = mm.id
  where mm.date between date '2025-03-27' and date '2026-03-27'
    and mp.student_id is not null
    and mp.assistant_id is not null

  union all

  -- Assistente em demonstração → approved_demonstracao
  select mp.assistant_id, false, false, false, false, true, false, false, false
  from public.midweek_ministry_parts mp
  join public.midweek_meetings mm on mp.meeting_id = mm.id
  where mm.date between date '2025-03-27' and date '2026-03-27'
    and mp.assistant_id is not null

  union all

  -- Estudante em apresentação solo (sem assistente) → approved_discurso_sala
  select mp.student_id, false, false, false, true, false, false, false, false
  from public.midweek_ministry_parts mp
  join public.midweek_meetings mm on mp.meeting_id = mm.id
  where mm.date between date '2025-03-27' and date '2026-03-27'
    and mp.student_id is not null
    and mp.assistant_id is null
),

-- Partes de Vida Cristã (oradores)
christian_life_roles as (
  select
    clp.speaker_id as member_id,
    false as has_presidente,
    false as has_oracao,
    false as has_leitura,
    true  as has_discurso,
    false as has_demonstracao,
    false as has_estudo,
    false as has_leitor_estudo,
    false as has_leitor_atalaia
  from public.midweek_christian_life_parts clp
  join public.midweek_meetings mm on clp.meeting_id = mm.id
  where mm.date between date '2025-03-27' and date '2026-03-27'
    and clp.speaker_id is not null
),

-- Papéis da reunião de fim de semana
weekend_roles as (
  select
    president_id as member_id,
    true  as has_presidente,
    false as has_oracao,
    false as has_leitura,
    false as has_discurso,
    false as has_demonstracao,
    false as has_estudo,
    false as has_leitor_estudo,
    false as has_leitor_atalaia
  from public.weekend_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and president_id is not null

  union all

  -- Oração final (fim de semana)
  select closing_prayer_id, false, true, false, false, false, false, false, false
  from public.weekend_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and closing_prayer_id is not null

  union all

  -- Leitor da Atalaia
  select watchtower_reader_id, false, false, false, false, false, false, false, true
  from public.weekend_meetings
  where date between date '2025-03-27' and date '2026-03-27'
    and watchtower_reader_id is not null
),

-- Agrupa todos os papéis
all_roles as (
  select * from midweek_main_roles
  union all
  select * from ministry_parts_roles
  union all
  select * from christian_life_roles
  union all
  select * from weekend_roles
),

-- Agrega por membro (se teve ao menos uma designação, recebe o privilégio)
aggregated as (
  select
    member_id,
    bool_or(has_presidente)       as has_presidente,
    bool_or(has_oracao)           as has_oracao,
    bool_or(has_leitura)          as has_leitura,
    bool_or(has_discurso)         as has_discurso,
    bool_or(has_demonstracao)     as has_demonstracao,
    bool_or(has_estudo)           as has_estudo,
    bool_or(has_leitor_estudo)    as has_leitor_estudo,
    bool_or(has_leitor_atalaia)   as has_leitor_atalaia
  from all_roles
  group by member_id
)

update public.members m
set
  approved_presidente_reuniao      = coalesce(m.approved_presidente_reuniao, false)      or a.has_presidente,
  approved_oracao                  = coalesce(m.approved_oracao, false)                  or a.has_oracao,
  approved_leitura_biblica         = coalesce(m.approved_leitura_biblica, false)         or a.has_leitura,
  approved_discurso_sala           = coalesce(m.approved_discurso_sala, false)           or a.has_discurso,
  approved_demonstracao            = coalesce(m.approved_demonstracao, false)            or a.has_demonstracao,
  approved_estudo_biblico          = coalesce(m.approved_estudo_biblico, false)          or a.has_estudo,
  approved_leitor_estudo_biblico   = coalesce(m.approved_leitor_estudo_biblico, false)   or a.has_leitor_estudo,
  approved_leitor_atalaia          = coalesce(m.approved_leitor_atalaia, false)          or a.has_leitor_atalaia
from aggregated a
where m.id = a.member_id;
