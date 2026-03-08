with period_assignments as (
  select *
  from public.audio_video_assignments
  where date >= date '2026-02-01'
    and date < date '2026-04-01'
),
assigned_roles as (
  select sound_member_id as member_id, true as has_sound, false as has_image, false as has_stage, false as has_roving, false as has_indicator
  from period_assignments
  where sound_member_id is not null

  union all

  select image_member_id as member_id, false as has_sound, true as has_image, false as has_stage, false as has_roving, false as has_indicator
  from period_assignments
  where image_member_id is not null

  union all

  select stage_member_id as member_id, false as has_sound, false as has_image, true as has_stage, false as has_roving, false as has_indicator
  from period_assignments
  where stage_member_id is not null

  union all

  select roving_mic_1_member_id as member_id, false as has_sound, false as has_image, false as has_stage, true as has_roving, false as has_indicator
  from period_assignments
  where roving_mic_1_member_id is not null

  union all

  select roving_mic_2_member_id as member_id, false as has_sound, false as has_image, false as has_stage, true as has_roving, false as has_indicator
  from period_assignments
  where roving_mic_2_member_id is not null

  union all

  select unnest(attendants_member_ids) as member_id, false as has_sound, false as has_image, false as has_stage, false as has_roving, true as has_indicator
  from period_assignments
  where coalesce(array_length(attendants_member_ids, 1), 0) > 0
),
aggregated_roles as (
  select
    member_id,
    bool_or(has_sound) as has_sound,
    bool_or(has_image) as has_image,
    bool_or(has_stage) as has_stage,
    bool_or(has_roving) as has_roving,
    bool_or(has_indicator) as has_indicator
  from assigned_roles
  group by member_id
)
update public.members m
set
  approved_sound = coalesce(m.approved_sound, false) or a.has_sound,
  approved_image = coalesce(m.approved_image, false) or a.has_image,
  approved_stage = coalesce(m.approved_stage, false) or a.has_stage,
  approved_roving_mic = coalesce(m.approved_roving_mic, false) or a.has_roving,
  approved_indicadores = coalesce(m.approved_indicadores, false) or a.has_indicator,
  approved_audio_video = (
    coalesce(m.approved_audio_video, false)
    or a.has_sound
    or a.has_image
    or a.has_stage
    or a.has_roving
  )
from aggregated_roles a
where m.id = a.member_id;
