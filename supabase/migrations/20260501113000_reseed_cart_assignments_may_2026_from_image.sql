begin;

delete from public.cart_assignments
where month = 5
  and year = 2026;

insert into public.cart_assignments (month, year, day, weekday, time, location, publisher1, publisher2, week)
values
  (5, 2026, 1, 'Sexta-feira', '16:00 ÀS 18:00', 'AÇOUGUE', 'Jorge Brandão', 'Meire Brandão', 1),
  (5, 2026, 2, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Barbara Silva', 'Mara', 1),
  (5, 2026, 2, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Claudio Evangelista', 'Giorgio', 1),

  (5, 2026, 5, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Leda', 'Maria Amorim', 2),
  (5, 2026, 5, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Nazareth', 'Maria Gutierrez', 2),
  (5, 2026, 6, 'Quarta-feira', '14:00 ÀS 16:00', 'AÇOUGUE', 'Andréa', 'Aparecida Santos', 2),
  (5, 2026, 7, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Kátia', 'Vera Andrade', 2),
  (5, 2026, 7, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Margarida', 'Cristiane', 2),
  (5, 2026, 8, 'Sexta-feira', '16:00 ÀS 18:00', 'AÇOUGUE', 'Sidnéia', 'Catarina', 2),
  (5, 2026, 9, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Bruna', 'Daiane', 2),
  (5, 2026, 9, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Cristiano', 'Amaury', 2),

  (5, 2026, 12, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Claudia Assis', 'Leonor', 3),
  (5, 2026, 12, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Ana Paula', 'Maria Rodrigues', 3),
  (5, 2026, 13, 'Quarta-feira', '14:00 ÀS 16:00', 'AÇOUGUE', 'Sidnéia', 'Maria Amorim', 3),
  (5, 2026, 13, 'Quarta-feira', '18:30 ÀS 19:30', 'SOUZA BUENO', 'Alexandre', 'Ademir', 3),
  (5, 2026, 14, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'David', 'Giorgio', 3),
  (5, 2026, 14, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Kátia', 'Leda', 3),
  (5, 2026, 15, 'Sexta-feira', '16:00 ÀS 18:00', 'AÇOUGUE', 'Margarida', 'Meire Brandão', 3),
  (5, 2026, 16, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Barbara Oliveira', 'Mayara', 3),
  (5, 2026, 16, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Anderson', 'Gilberto', 3),

  (5, 2026, 19, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Nazareth', 'Ana Paula', 4),
  (5, 2026, 19, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Cristiane', 'Vera Andrade', 4),
  (5, 2026, 20, 'Quarta-feira', '14:00 ÀS 16:00', 'AÇOUGUE', 'Andréa', 'Maria Rodrigues', 4),
  (5, 2026, 21, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Maria Gutierrez', 'Leonor', 4),
  (5, 2026, 21, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Catarina', 'Margarida', 4),
  (5, 2026, 22, 'Sexta-feira', '16:00 ÀS 18:00', 'AÇOUGUE', 'Claudia Xavier', 'Meire Brandão', 4),
  (5, 2026, 23, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Elisabete', 'Silmara', 4),
  (5, 2026, 23, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Dionas', 'Paulo César', 4),

  (5, 2026, 26, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Claudia Assis', 'Cristiane', 5),
  (5, 2026, 26, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Ana Paula', 'Kátia', 5),
  (5, 2026, 27, 'Quarta-feira', '14:00 ÀS 16:00', 'AÇOUGUE', 'Aparecida Santos', 'Maria Amorim', 5),
  (5, 2026, 27, 'Quarta-feira', '18:30 ÀS 19:30', 'SOUZA BUENO', 'Giorgio', 'Sérgio', 5),
  (5, 2026, 28, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Maria Gutierrez', 'Catarina', 5),
  (5, 2026, 28, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Valdemar', 'Luzia', 5),
  (5, 2026, 29, 'Sexta-feira', '16:00 ÀS 18:00', 'AÇOUGUE', 'Claudia Xavier', 'Sidnéia', 5),
  (5, 2026, 30, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Érica nascimento', 'Angelica', 5),
  (5, 2026, 30, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Alexandre', 'David', 5);

commit;
