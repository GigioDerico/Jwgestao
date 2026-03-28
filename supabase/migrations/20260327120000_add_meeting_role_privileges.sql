alter table public.members
  -- Reunião de Meio de Semana
  add column if not exists approved_oracao boolean not null default false,
  add column if not exists approved_leitura_biblica boolean not null default false,
  add column if not exists approved_discurso_sala boolean not null default false,
  add column if not exists approved_demonstracao boolean not null default false,
  add column if not exists approved_estudo_biblico boolean not null default false,
  add column if not exists approved_leitor_estudo_biblico boolean not null default false,
  -- Reunião de Fim de Semana
  add column if not exists approved_leitor_atalaia boolean not null default false,
  add column if not exists approved_discurso_publico boolean not null default false,
  add column if not exists approved_presidente_reuniao boolean not null default false;
