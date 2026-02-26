-- Temporarily allowing anon access for MVP Development
CREATE POLICY "Allow public read access on members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on members" ON public.members FOR DELETE USING (true);

CREATE POLICY "Allow public read access on field_service_groups" ON public.field_service_groups FOR SELECT USING (true);
CREATE POLICY "Allow public read access on member_privileges" ON public.member_privileges FOR SELECT USING (true);
CREATE POLICY "Allow public read access on user_profiles" ON public.user_profiles FOR SELECT USING (true);

-- Meetings
CREATE POLICY "Allow public read access on midweek_meetings" ON public.midweek_meetings FOR SELECT USING (true);
CREATE POLICY "Allow public read access on midweek_ministry_parts" ON public.midweek_ministry_parts FOR SELECT USING (true);
CREATE POLICY "Allow public read access on midweek_christian_life_parts" ON public.midweek_christian_life_parts FOR SELECT USING (true);
CREATE POLICY "Allow public read access on weekend_meetings" ON public.weekend_meetings FOR SELECT USING (true);
