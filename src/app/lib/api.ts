import { supabase } from './supabase';
import { Database } from './supabase-types';

export const api = {
  // Members
  async getMembers() {
    const { data, error } = await supabase.from('members').select('*').order('full_name');
    if (error) throw error;
    return data;
  },

  // Midweek Meetings 
  async getMidweekMeetings() {
    const { data, error } = await supabase
      .from('midweek_meetings')
      .select(`
        *,
        president:members!midweek_meetings_president_id_fkey(full_name),
        opening_prayer:members!midweek_meetings_opening_prayer_id_fkey(full_name),
        closing_prayer:members!midweek_meetings_closing_prayer_id_fkey(full_name),
        treasure_talk_speaker:members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
        treasure_gems_speaker:members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
        treasure_reading_student:members!midweek_meetings_treasure_reading_student_id_fkey(full_name),
        cbs_conductor:members!midweek_meetings_cbs_conductor_id_fkey(full_name),
        cbs_reader:members!midweek_meetings_cbs_reader_id_fkey(full_name),
        ministry_parts:midweek_ministry_parts(*, student:members!midweek_ministry_parts_student_id_fkey(full_name), assistant:members!midweek_ministry_parts_assistant_id_fkey(full_name)),
        christian_life_parts:midweek_christian_life_parts(*, speaker:members!midweek_christian_life_parts_speaker_id_fkey(full_name))
      `)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Weekend Meetings
  async getWeekendMeetings() {
    const { data, error } = await supabase
      .from('weekend_meetings')
      .select(`
        *,
        president:members!weekend_meetings_president_id_fkey(full_name),
        closing_prayer:members!weekend_meetings_closing_prayer_id_fkey(full_name),
        watchtower_conductor:members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
        watchtower_reader:members!weekend_meetings_watchtower_reader_id_fkey(full_name)
      `)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }
};
