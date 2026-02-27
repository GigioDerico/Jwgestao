-- Persistent assignment tables for MVP scheduling

CREATE TABLE IF NOT EXISTS public.audio_video_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  weekday VARCHAR(30) NOT NULL,
  sound VARCHAR(255) NOT NULL,
  image VARCHAR(255) NOT NULL,
  stage VARCHAR(255) NOT NULL,
  roving_mic_1 VARCHAR(255) NOT NULL,
  roving_mic_2 VARCHAR(255) NOT NULL,
  attendants TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.field_service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  weekday VARCHAR(80) NOT NULL,
  time VARCHAR(80) NOT NULL,
  responsible VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT '',
  category VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  day INTEGER NOT NULL,
  weekday VARCHAR(40) NOT NULL,
  time VARCHAR(80) NOT NULL,
  location VARCHAR(255) NOT NULL,
  publisher1 VARCHAR(255) NOT NULL,
  publisher2 VARCHAR(255) NOT NULL,
  week INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_video_assignments_date ON public.audio_video_assignments(date);
CREATE INDEX IF NOT EXISTS idx_field_service_assignments_period ON public.field_service_assignments(year, month);
CREATE INDEX IF NOT EXISTS idx_cart_assignments_period ON public.cart_assignments(year, month);

ALTER TABLE public.audio_video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on audio_video_assignments" ON public.audio_video_assignments;
DROP POLICY IF EXISTS "Allow public insert on audio_video_assignments" ON public.audio_video_assignments;
DROP POLICY IF EXISTS "Allow public update on audio_video_assignments" ON public.audio_video_assignments;
DROP POLICY IF EXISTS "Allow public delete on audio_video_assignments" ON public.audio_video_assignments;

CREATE POLICY "Allow public select on audio_video_assignments" ON public.audio_video_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on audio_video_assignments" ON public.audio_video_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on audio_video_assignments" ON public.audio_video_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on audio_video_assignments" ON public.audio_video_assignments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on field_service_assignments" ON public.field_service_assignments;
DROP POLICY IF EXISTS "Allow public insert on field_service_assignments" ON public.field_service_assignments;
DROP POLICY IF EXISTS "Allow public update on field_service_assignments" ON public.field_service_assignments;
DROP POLICY IF EXISTS "Allow public delete on field_service_assignments" ON public.field_service_assignments;

CREATE POLICY "Allow public select on field_service_assignments" ON public.field_service_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on field_service_assignments" ON public.field_service_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on field_service_assignments" ON public.field_service_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on field_service_assignments" ON public.field_service_assignments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on cart_assignments" ON public.cart_assignments;
DROP POLICY IF EXISTS "Allow public insert on cart_assignments" ON public.cart_assignments;
DROP POLICY IF EXISTS "Allow public update on cart_assignments" ON public.cart_assignments;
DROP POLICY IF EXISTS "Allow public delete on cart_assignments" ON public.cart_assignments;

CREATE POLICY "Allow public select on cart_assignments" ON public.cart_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on cart_assignments" ON public.cart_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on cart_assignments" ON public.cart_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on cart_assignments" ON public.cart_assignments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public insert on midweek_meetings" ON public.midweek_meetings;
DROP POLICY IF EXISTS "Allow public update on midweek_meetings" ON public.midweek_meetings;
DROP POLICY IF EXISTS "Allow public delete on midweek_meetings" ON public.midweek_meetings;
DROP POLICY IF EXISTS "Allow public insert on midweek_ministry_parts" ON public.midweek_ministry_parts;
DROP POLICY IF EXISTS "Allow public update on midweek_ministry_parts" ON public.midweek_ministry_parts;
DROP POLICY IF EXISTS "Allow public delete on midweek_ministry_parts" ON public.midweek_ministry_parts;
DROP POLICY IF EXISTS "Allow public insert on midweek_christian_life_parts" ON public.midweek_christian_life_parts;
DROP POLICY IF EXISTS "Allow public update on midweek_christian_life_parts" ON public.midweek_christian_life_parts;
DROP POLICY IF EXISTS "Allow public delete on midweek_christian_life_parts" ON public.midweek_christian_life_parts;
DROP POLICY IF EXISTS "Allow public insert on weekend_meetings" ON public.weekend_meetings;
DROP POLICY IF EXISTS "Allow public update on weekend_meetings" ON public.weekend_meetings;
DROP POLICY IF EXISTS "Allow public delete on weekend_meetings" ON public.weekend_meetings;

CREATE POLICY "Allow public insert on midweek_meetings" ON public.midweek_meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on midweek_meetings" ON public.midweek_meetings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on midweek_meetings" ON public.midweek_meetings FOR DELETE USING (true);

CREATE POLICY "Allow public insert on midweek_ministry_parts" ON public.midweek_ministry_parts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on midweek_ministry_parts" ON public.midweek_ministry_parts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on midweek_ministry_parts" ON public.midweek_ministry_parts FOR DELETE USING (true);

CREATE POLICY "Allow public insert on midweek_christian_life_parts" ON public.midweek_christian_life_parts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on midweek_christian_life_parts" ON public.midweek_christian_life_parts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on midweek_christian_life_parts" ON public.midweek_christian_life_parts FOR DELETE USING (true);

CREATE POLICY "Allow public insert on weekend_meetings" ON public.weekend_meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on weekend_meetings" ON public.weekend_meetings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on weekend_meetings" ON public.weekend_meetings FOR DELETE USING (true);

INSERT INTO public.audio_video_assignments (date, weekday, sound, image, stage, roving_mic_1, roving_mic_2, attendants)
SELECT * FROM (
  VALUES
    ('2026-02-01'::date, 'Domingo', 'Vitor', 'Gilberto Brandão', 'Jairo Costa', 'João Pedro', 'Júlio', ARRAY['Carlos', 'Nadir', 'Anderson']::text[]),
    ('2026-02-05'::date, 'Quinta', 'Matheus', 'Anderson Paim', 'Pietro', 'Vitor', 'Nadir', ARRAY['Jairo Costa', 'Giorgio Derico', 'Gilberto Brandão']::text[]),
    ('2026-02-08'::date, 'Domingo', 'Ademir Souza', 'Marcelo Souza', 'Cláudio', 'Matheus', 'Isaque', ARRAY['Vitor', 'Paulo Cesar', 'Amilton Guimarães']::text[]),
    ('2026-02-12'::date, 'Quinta', 'Guilherme', 'Paulo Cesar', 'João Pedro', 'Pietro', 'Jairo Costa', ARRAY['Ademir Souza', 'Cláudio', 'Nadir']::text[]),
    ('2026-02-15'::date, 'Domingo', 'Júlio', 'Giorgio Derico', 'Pietro', 'Guilherme', 'João Pedro', ARRAY['Ed Carlos Pinheiro', 'Gilberto Brandão', 'Jairo Costa']::text[]),
    ('2026-02-19'::date, 'Quinta', 'João Pedro', 'Marcelo Souza', 'Vítor', 'João Vitor', 'Ademir Souza', ARRAY['Anderson Paim', 'Giorgio Derico', 'Paulo Cesar']::text[]),
    ('2026-02-22'::date, 'Domingo', 'João Vitor', 'Gilberto Brandão', 'Mateus', 'Cláudio', 'Pietro', ARRAY['Vitor', 'Amilton Guimarães', 'Ronaldo Xavier']::text[]),
    ('2026-02-26'::date, 'Quinta', 'Pietro', 'Giorgio Derico', 'João Vitor', 'Matheus', 'Júlio', ARRAY['Nadir', 'Ademir Souza', 'Cláudio']::text[])
) AS seed(date, weekday, sound, image, stage, roving_mic_1, roving_mic_2, attendants)
WHERE NOT EXISTS (SELECT 1 FROM public.audio_video_assignments);

INSERT INTO public.field_service_assignments (month, year, weekday, time, responsible, location, category)
SELECT * FROM (
  VALUES
    (2, 2026, 'Terça-feira', '16:30', 'Amilton Guimarães', 'Salão do Reino', 'Terça-feira'),
    (2, 2026, 'Quarta-feira', '08:45', 'Sergio Batista', 'Salão do Reino', 'Quarta-feira'),
    (2, 2026, 'Sexta-feira', '08:45', 'Giorgio Derico', 'Salão do Reino', 'Sexta-feira'),
    (2, 2026, 'Sábado 07/02', '16:30', 'Gilberto Brandão', 'Salão do Reino', 'Sábado'),
    (2, 2026, 'Sábado 14/02', '16:30', 'Giorgio Derico', 'Salão do Reino', 'Sábado'),
    (2, 2026, 'Sábado 21/02', '16:30', 'Sergio Batista', 'Salão do Reino', 'Sábado'),
    (2, 2026, 'Sábado 28/02', '16:30', 'Cláudio Evangelista', 'Salão do Reino', 'Sábado'),
    (2, 2026, 'Sábado 07/02', '08:00', 'Ed Carlos Pinheiro', 'Salão do Reino', 'Sábado - Rural'),
    (2, 2026, 'Sábado 21/02', '08:00', 'Josenildo Novaes', 'Salão do Reino', 'Sábado - Rural'),
    (2, 2026, 'Domingo', '08:30 / 08:45', 'Saída dos Grupos', '', 'Domingo')
) AS seed(month, year, weekday, time, responsible, location, category)
WHERE NOT EXISTS (SELECT 1 FROM public.field_service_assignments);

INSERT INTO public.cart_assignments (month, year, day, weekday, time, location, publisher1, publisher2, week)
SELECT * FROM (
  VALUES
    (1, 2026, 6, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Margarida', 'Kátia', 1),
    (1, 2026, 6, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Catarina Pedroso', 'Ana Paula', 1),
    (1, 2026, 7, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Nazareth', 'Cláudia Assis', 1),
    (1, 2026, 7, 'Quarta-feira', '18:30 às 19:30', 'Souza Bueno', 'Gilberto Brandão', 'Sérgio', 1),
    (1, 2026, 8, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Luzia', 'Valdemar Moreira', 1),
    (1, 2026, 8, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Maria Amorim', 'Fátima Guimarães', 1),
    (1, 2026, 9, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Jorge Brandão', 'Meire Brandão', 1),
    (1, 2026, 10, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Silmara', 'Bruna', 1),
    (1, 2026, 10, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Amaury Lira', 'Giorgio Derico', 1),
    (1, 2026, 13, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Nazareth', 'Vera Andrade', 2),
    (1, 2026, 13, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Jorge Brandão', 'Amilton Guimarães', 2),
    (1, 2026, 14, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Maria Amorim', 'Catarina Pedroso', 2),
    (1, 2026, 14, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Leonor', 'Ana Paula', 2),
    (1, 2026, 15, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Margarida', 'Fátima Guimarães', 2),
    (1, 2026, 16, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Cláudia Assis', 'Sidnéia', 2),
    (1, 2026, 17, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Mara Batista', 'Elisabete', 2),
    (1, 2026, 17, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Dionas Assis', 'Claudio Evangelista', 2),
    (1, 2026, 20, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Nazareth', 'Catarina Pedroso', 3),
    (1, 2026, 20, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Maria Amorim', 'Vera Andrade', 3),
    (1, 2026, 21, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Amilton Guimarães', 'Jorge Brandão', 3),
    (1, 2026, 21, 'Quarta-feira', '18:30 às 19:30', 'Souza Bueno', 'Anderson Paim', 'Alexandre Batista', 3),
    (1, 2026, 22, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Giorgio Derico', 'David', 3),
    (1, 2026, 22, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Valdemar Moreira', 'Luzia', 3),
    (1, 2026, 23, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Cláudia Assis', 'Ana Paula', 3),
    (1, 2026, 24, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Barbara Silva', 'Mayara', 3),
    (1, 2026, 24, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Sérgio', 'Paulo Cesar', 3),
    (1, 2026, 27, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Maria Amorim', 'Margarida', 4),
    (1, 2026, 27, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Amilton Guimarães', 'David', 4),
    (1, 2026, 28, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Leonor', 'Maria Amorim', 4),
    (1, 2026, 29, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Cristiane', 'Kátia', 4),
    (1, 2026, 29, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Valdemar Moreira', 'Luzia', 4),
    (1, 2026, 30, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Cláudia Assis', 'Meire Brandão', 4),
    (1, 2026, 31, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Barbara Silva', 'Andréa', 4),
    (1, 2026, 31, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Cristiano', 'Alexandre Batista', 4)
) AS seed(month, year, day, weekday, time, location, publisher1, publisher2, week)
WHERE NOT EXISTS (SELECT 1 FROM public.cart_assignments);
