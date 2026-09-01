begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_column(
  'public',
  'field_service_assignments',
  'responsible_2',
  'field service assignments expose a second responsible name'
);
select col_type_is(
  'public',
  'field_service_assignments',
  'responsible_2',
  'character varying(255)',
  'second responsible name is a varchar(255)'
);
select col_is_null(
  'public',
  'field_service_assignments',
  'responsible_2',
  'second responsible name is optional'
);
select has_column(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'field service assignments expose a second responsible member link'
);
select col_type_is(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'uuid',
  'second responsible member link is a uuid'
);
select col_is_null(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'second responsible member link is optional'
);
select col_is_fk(
  'public',
  'field_service_assignments',
  'responsible_2_member_id',
  'second responsible member link is a foreign key'
);

-- Membro inelegível não pode ser designado como segundo dirigente.
insert into public.members (id, full_name, spiritual_status, gender)
values ('11111111-1111-1111-1111-111111111111', 'Irmão Inativo', 'inativo', 'M');

insert into public.members (id, full_name, spiritual_status, gender)
values ('22222222-2222-2222-2222-222222222222', 'Irmão Ativo', 'publicador', 'M');

select throws_ok(
  $test$
    insert into public.field_service_assignments
      (month, year, weekday, time, responsible, location, category,
       responsible_2, responsible_2_member_id)
    values
      (9, 2026, 'Segunda-feira', '08:45', 'A definir', 'Salão do Reino',
       'Segunda-feira', 'Irmão Inativo', '11111111-1111-1111-1111-111111111111')
  $test$,
  'P0001',
  'Membro inativo não pode receber designações.',
  'second responsible rejects ineligible members'
);

select lives_ok(
  $test$
    insert into public.field_service_assignments
      (month, year, weekday, time, responsible, location, category,
       responsible_2, responsible_2_member_id)
    values
      (9, 2026, 'Terça-feira', '16:30', 'A definir', 'Salão do Reino',
       'Terça-feira', 'Irmão Ativo', '22222222-2222-2222-2222-222222222222')
  $test$,
  'second responsible accepts eligible members'
);

select * from finish();

rollback;
