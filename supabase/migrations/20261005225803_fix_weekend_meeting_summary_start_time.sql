-- Weekend meeting time is stored in app_settings, not on weekend_meetings.
create or replace function private.get_personal_meetings(p_period text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid; result jsonb; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  actor := private.personal_assignment_actor();
  if p_period is null or p_period not in ('upcoming','past') then
    raise exception using errcode = '22023', message = 'personal_meeting_period_invalid';
  end if;
  with meetings as (
    select m.id, 'midweek'::text kind, m.date,
      coalesce(m.opening_song_time::text, nullif((select s.value from public.app_settings s where s.key='midweek_meeting_time'),'')) start_time
    from public.midweek_meetings m where (p_period='upcoming' and m.date >= today) or (p_period='past' and m.date < today)
    union all
    select m.id, 'weekend', m.date,
      nullif((select s.value from public.app_settings s where s.key='weekend_meeting_time'),'')
    from public.weekend_meetings m where (p_period='upcoming' and m.date >= today) or (p_period='past' and m.date < today)
  ), rows as (
    select m.id,m.kind,m.date,m.start_time,counts.assignment_count,counts.pending_count
    from meetings m
    cross join lateral (
      select count(*)::integer assignment_count,
        count(*) filter(where coalesce((a.assignment->>'can_respond')::boolean,false))::integer pending_count
      from jsonb_array_elements(private.get_personal_meeting_assignments(m.kind,m.id)) as a(assignment)
    ) counts
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'date',date,'start_time',start_time,
    'assignment_count',assignment_count,'pending_count',pending_count)
    order by case when p_period='past' then -extract(epoch from date::timestamp) else extract(epoch from date::timestamp) end), '[]'::jsonb)
  into result from rows;
  return result;
end;
$$;
