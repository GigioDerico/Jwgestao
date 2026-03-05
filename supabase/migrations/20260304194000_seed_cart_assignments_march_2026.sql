insert into public.cart_assignments (month, year, day, weekday, time, location, publisher1, publisher2, week)
select
  seed.month,
  seed.year,
  seed.day,
  seed.weekday,
  seed.time,
  seed.location,
  seed.publisher1,
  seed.publisher2,
  seed.week
from (
  values
    (3, 2026, 3, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Maria Amorim', 'Maria Gutierrez', 1),
    (3, 2026, 3, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Claudia Assis', 'Maria Rodrigues', 1),
    (3, 2026, 4, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Fátima Guimarães', 'Catarina', 1),
    (3, 2026, 4, 'Quarta-feira', '18:30 às 19:30', 'Souza Bueno', 'Anderson', 'Sérgio', 1),
    (3, 2026, 5, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Valdemar', 'Luzia', 1),
    (3, 2026, 5, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Kátia', 'Cristiane', 1),
    (3, 2026, 6, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Sidnéia', 'Leda', 1),
    (3, 2026, 7, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Andréa', 'Angelica', 1),
    (3, 2026, 7, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Claudio Evangelista', 'Paulo Cezar', 1),
    (3, 2026, 10, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Nazareth', 'Kátia', 2),
    (3, 2026, 10, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Claudia Xavier', 'Vera Andrade', 2),
    (3, 2026, 11, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Amilton', 'Fátima Guimarães', 2),
    (3, 2026, 12, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Margarida', 'Ana Paula', 2),
    (3, 2026, 12, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'David', 'Leonor', 2),
    (3, 2026, 13, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Jorge Brandão', 'Meire Brandão', 2),
    (3, 2026, 14, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Luciana', 'Mara', 2),
    (3, 2026, 14, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Cristiano', 'Alexandre', 2),
    (3, 2026, 17, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Nazareth', 'Ana Paula', 3),
    (3, 2026, 17, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Maria Amorim', 'Leda', 3),
    (3, 2026, 18, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Maria Rodrigues', 'Maria Gutierrez', 3),
    (3, 2026, 18, 'Quarta-feira', '18:30 às 19:30', 'Souza Bueno', 'Giorgio', 'Gilberto', 3),
    (3, 2026, 19, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Ademir', 'Amilton', 3),
    (3, 2026, 19, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Valdemar', 'Luzia', 3),
    (3, 2026, 20, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Claudia Xavier', 'Meire Brandão', 3),
    (3, 2026, 21, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Elisabete', 'Mayara', 3),
    (3, 2026, 21, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Anderson', 'Amaury', 3),
    (3, 2026, 24, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Claudia Assis', 'Leonor', 4),
    (3, 2026, 24, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'David', 'Amilton', 4),
    (3, 2026, 25, 'Quarta-feira', '14:00 às 16:00', 'Padaria da Bete', 'Vera Andrade', 'Ana Paula', 4),
    (3, 2026, 26, 'Quinta-feira', '08:00 às 10:00', 'Feira (Prox. Câmara)', 'Cristiane', 'Margarida', 4),
    (3, 2026, 26, 'Quinta-feira', '10:00 às 12:00', 'Feira (Prox. Câmara)', 'Catarina', 'Maria Amorim', 4),
    (3, 2026, 27, 'Sexta-feira', '16:00 às 18:00', 'Padaria da Bete', 'Sidnéia', 'Kátia', 4),
    (3, 2026, 28, 'Sábado', '11:00 às 12:00', 'Souza Bueno', 'Barbara Silva', 'Barbara Oliveira', 4),
    (3, 2026, 28, 'Sábado', '12:00 às 13:00', 'Souza Bueno', 'Dionas', 'Gilberto', 4),
    (3, 2026, 31, 'Terça-feira', '09:00 às 11:00', 'Hospital', 'Maria Gutierrez', 'Catarina', 5),
    (3, 2026, 31, 'Terça-feira', '14:00 às 16:00', 'Hospital', 'Claudia Assis', 'Margarida', 5)
) as seed(month, year, day, weekday, time, location, publisher1, publisher2, week)
where not exists (
  select 1
  from public.cart_assignments as existing
  where existing.month = seed.month
    and existing.year = seed.year
    and existing.day = seed.day
    and existing.weekday = seed.weekday
    and existing.time = seed.time
    and existing.location = seed.location
);
