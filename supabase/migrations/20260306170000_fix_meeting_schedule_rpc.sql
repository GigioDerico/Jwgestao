create or replace function public.get_midweek_meetings_schedule()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(meeting_payload order by meeting_date),
    '[]'::jsonb
  )
  from (
    select
      mw.date as meeting_date,
      jsonb_build_object(
        'id', mw.id,
        'date', mw.date,
        'bible_reading', mw.bible_reading,
        'opening_song', mw.opening_song,
        'opening_song_time', mw.opening_song_time,
        'opening_comments_duration', mw.opening_comments_duration,
        'opening_comments_time', mw.opening_comments_time,
        'middle_song', mw.middle_song,
        'middle_song_time', mw.middle_song_time,
        'closing_song', mw.closing_song,
        'closing_song_time', mw.closing_song_time,
        'closing_comments_duration', mw.closing_comments_duration,
        'closing_comments_time', mw.closing_comments_time,
        'treasure_talk_title', mw.treasure_talk_title,
        'treasure_talk_duration', mw.treasure_talk_duration,
        'treasure_talk_time', mw.treasure_talk_time,
        'treasure_gems_duration', mw.treasure_gems_duration,
        'treasure_gems_time', mw.treasure_gems_time,
        'treasure_reading_duration', mw.treasure_reading_duration,
        'treasure_reading_time', mw.treasure_reading_time,
        'cbs_duration', mw.cbs_duration,
        'cbs_time', mw.cbs_time,
        'president_id', mw.president_id,
        'opening_prayer_id', mw.opening_prayer_id,
        'closing_prayer_id', mw.closing_prayer_id,
        'treasure_talk_speaker_id', mw.treasure_talk_speaker_id,
        'treasure_gems_speaker_id', mw.treasure_gems_speaker_id,
        'treasure_reading_student_id', mw.treasure_reading_student_id,
        'cbs_conductor_id', mw.cbs_conductor_id,
        'cbs_reader_id', mw.cbs_reader_id,
        'president', case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone) end,
        'opening_prayer', case when op.id is null then null else jsonb_build_object('id', op.id, 'full_name', op.full_name) end,
        'closing_prayer', case when cp.id is null then null else jsonb_build_object('id', cp.id, 'full_name', cp.full_name) end,
        'treasure_talk_speaker', case when tts.id is null then null else jsonb_build_object('id', tts.id, 'full_name', tts.full_name) end,
        'treasure_gems_speaker', case when tgs.id is null then null else jsonb_build_object('id', tgs.id, 'full_name', tgs.full_name) end,
        'treasure_reading_student', case when trs.id is null then null else jsonb_build_object('id', trs.id, 'full_name', trs.full_name, 'phone', trs.phone) end,
        'cbs_conductor', case when cbsc.id is null then null else jsonb_build_object('id', cbsc.id, 'full_name', cbsc.full_name) end,
        'cbs_reader', case when cbsr.id is null then null else jsonb_build_object('id', cbsr.id, 'full_name', cbsr.full_name) end,
        'ministry_parts', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', mp.id,
              'meeting_id', mp.meeting_id,
              'part_number', mp.part_number,
              'title', mp.title,
              'duration', mp.duration,
              'student_id', mp.student_id,
              'assistant_id', mp.assistant_id,
              'student', case when sm.id is null then null else jsonb_build_object('id', sm.id, 'full_name', sm.full_name, 'phone', sm.phone) end,
              'assistant', case when am.id is null then null else jsonb_build_object('id', am.id, 'full_name', am.full_name) end
            )
            order by mp.part_number asc, mp.created_at asc
          )
          from public.midweek_ministry_parts mp
          left join public.members sm on sm.id = mp.student_id
          left join public.members am on am.id = mp.assistant_id
          where mp.meeting_id = mw.id
        ), '[]'::jsonb),
        'christian_life_parts', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', clp.id,
              'meeting_id', clp.meeting_id,
              'part_number', clp.part_number,
              'title', clp.title,
              'duration', clp.duration,
              'speaker_id', clp.speaker_id,
              'speaker', case when sp.id is null then null else jsonb_build_object('id', sp.id, 'full_name', sp.full_name) end
            )
            order by clp.part_number asc, clp.created_at asc
          )
          from public.midweek_christian_life_parts clp
          left join public.members sp on sp.id = clp.speaker_id
          where clp.meeting_id = mw.id
        ), '[]'::jsonb)
      ) as meeting_payload
    from public.midweek_meetings mw
    left join public.members p on p.id = mw.president_id
    left join public.members op on op.id = mw.opening_prayer_id
    left join public.members cp on cp.id = mw.closing_prayer_id
    left join public.members tts on tts.id = mw.treasure_talk_speaker_id
    left join public.members tgs on tgs.id = mw.treasure_gems_speaker_id
    left join public.members trs on trs.id = mw.treasure_reading_student_id
    left join public.members cbsc on cbsc.id = mw.cbs_conductor_id
    left join public.members cbsr on cbsr.id = mw.cbs_reader_id
    where public.has_role_permission('can_view_meetings')
  ) scheduled;
$$;

grant execute on function public.get_midweek_meetings_schedule() to authenticated;

create or replace function public.get_weekend_meetings_schedule()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(meeting_payload order by meeting_date),
    '[]'::jsonb
  )
  from (
    select
      we.date as meeting_date,
      jsonb_build_object(
        'id', we.id,
        'date', we.date,
        'talk_theme', we.talk_theme,
        'talk_speaker_name', we.talk_speaker_name,
        'talk_congregation', we.talk_congregation,
        'president_id', we.president_id,
        'closing_prayer_id', we.closing_prayer_id,
        'watchtower_conductor_id', we.watchtower_conductor_id,
        'watchtower_reader_id', we.watchtower_reader_id,
        'president', case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone) end,
        'closing_prayer', case when cp.id is null then null else jsonb_build_object('id', cp.id, 'full_name', cp.full_name) end,
        'watchtower_conductor', case when wc.id is null then null else jsonb_build_object('id', wc.id, 'full_name', wc.full_name) end,
        'watchtower_reader', case when wr.id is null then null else jsonb_build_object('id', wr.id, 'full_name', wr.full_name, 'phone', wr.phone) end
      ) as meeting_payload
    from public.weekend_meetings we
    left join public.members p on p.id = we.president_id
    left join public.members cp on cp.id = we.closing_prayer_id
    left join public.members wc on wc.id = we.watchtower_conductor_id
    left join public.members wr on wr.id = we.watchtower_reader_id
    where public.has_role_permission('can_view_meetings')
  ) scheduled;
$$;

grant execute on function public.get_weekend_meetings_schedule() to authenticated;
