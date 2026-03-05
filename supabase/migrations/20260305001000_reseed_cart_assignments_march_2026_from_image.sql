begin;

delete from public.cart_assignments
where month = 3
  and year = 2026;

insert into public.cart_assignments (month, year, day, weekday, time, location, publisher1, publisher2, week)
values
  (3, 2026, 3, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Maria Amorim', 'Maria Gutierrez', 1),
  (3, 2026, 3, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Claudia Assis', 'Maria Rodrigues', 1),
  (3, 2026, 4, 'Quarta-feira', '14:00 ÀS 16:00', 'PADARIA DA BETE', 'Fátima Guimarães', 'Catarina', 1),
  (3, 2026, 4, 'Quarta-feira', '18:30 ÀS 19:30', 'SOUZA BUENO', 'Anderson', 'Sérgio', 1),
  (3, 2026, 5, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Valdemar', 'Luzia', 1),
  (3, 2026, 5, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Kátia', 'Cristiane', 1),
  (3, 2026, 6, 'Sexta-feira', '16:00 ÀS 18:00', 'PADARIA DA BETE', 'Sidnéia', 'Leda', 1),
  (3, 2026, 7, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Andréa', 'Angelica', 1),
  (3, 2026, 7, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Claudio Evangelista', 'Paulo Cezar', 1),
  (3, 2026, 10, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Nazareth', 'Kátia', 2),
  (3, 2026, 10, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Claudia Xavier', 'Vera Andrade', 2),
  (3, 2026, 11, 'Quarta-feira', '14:00 ÀS 16:00', 'PADARIA DA BETE', 'Amilton', 'Fátima Guimarães', 2),
  (3, 2026, 12, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Margarida', 'Ana Paula', 2),
  (3, 2026, 12, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'David', 'Leonor', 2),
  (3, 2026, 13, 'Sexta-feira', '16:00 ÀS 18:00', 'PADARIA DA BETE', 'Jorge Brandão', 'Meire Brandão', 2),
  (3, 2026, 14, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Luciana', 'Mara', 2),
  (3, 2026, 14, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Cristiano', 'Alexandre', 2),
  (3, 2026, 17, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Nazareth', 'Ana Paula', 3),
  (3, 2026, 17, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Maria Amorim', 'Leda', 3),
  (3, 2026, 18, 'Quarta-feira', '14:00 ÀS 16:00', 'PADARIA DA BETE', 'Maria Rodrigues', 'Maria Gutierrez', 3),
  (3, 2026, 18, 'Quarta-feira', '18:30 ÀS 19:30', 'SOUZA BUENO', 'Giorgio', 'Gilberto', 3),
  (3, 2026, 19, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Ademir', 'Amilton', 3),
  (3, 2026, 19, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Valdemar', 'Luzia', 3),
  (3, 2026, 20, 'Sexta-feira', '16:00 ÀS 18:00', 'PADARIA DA BETE', 'Claudia Xavier', 'Meire Brandão', 3),
  (3, 2026, 21, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Elisabete', 'Mayara', 3),
  (3, 2026, 21, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Anderson', 'Amaury', 3),
  (3, 2026, 24, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Claudia Assis', 'Leonor', 4),
  (3, 2026, 24, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'David', 'Amilton', 4),
  (3, 2026, 25, 'Quarta-feira', '14:00 ÀS 16:00', 'PADARIA DA BETE', 'Vera Andrade', 'Ana Paula', 4),
  (3, 2026, 26, 'Quinta-feira', '08:00 ÀS 10:00', 'FEIRA (PROX. CAMARA)', 'Cristiane', 'Margarida', 4),
  (3, 2026, 26, 'Quinta-feira', '10:00 ÀS 12:00', 'FEIRA (PROX. CAMARA)', 'Catarina', 'Maria Amorim', 4),
  (3, 2026, 27, 'Sexta-feira', '16:00 ÀS 18:00', 'PADARIA DA BETE', 'Sidnéia', 'Kátia', 4),
  (3, 2026, 28, 'Sábado', '11:00 ÀS 12:00', 'SOUZA BUENO', 'Barbara Silva', 'Barbara Oliveira', 4),
  (3, 2026, 28, 'Sábado', '12:00 ÀS 13:00', 'SOUZA BUENO', 'Dionas', 'Gilberto', 4),
  (3, 2026, 31, 'Terça-feira', '09:00 ÀS 11:00', 'HOSPITAL', 'Maria Gutierrez', 'Catarina', 5),
  (3, 2026, 31, 'Terça-feira', '14:00 ÀS 16:00', 'HOSPITAL', 'Claudia Assis', 'Margarida', 5);

commit;
