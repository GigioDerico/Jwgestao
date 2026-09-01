-- Verifica que a transferência de congregação (public.transfer_member) trata
-- o segundo dirigente da saída de campo (responsible_2/responsible_2_member_id)
-- exatamente como trata o primeiro, mirando o padrão publisher1/publisher2
-- de cart_assignments. Fixture isolada, sem depender de
-- member_congregation_transfer.test.sql.

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- Ator com permissão para transferir membros.
insert into auth.users (id, email)
values (
  '90000000-0000-0000-0000-000000000001',
  'field-service-transfer-admin@example.invalid'
);

insert into public.user_profiles (id, system_role, is_active)
values (
  '90000000-0000-0000-0000-000000000001',
  'coordenador',
  true
);

-- Membro que será transferido: nome único para exercitar o casamento por
-- nome legado (sem responsible_2_member_id), igual ao já testado para o
-- primeiro dirigente.
insert into public.members (id, full_name, gender, spiritual_status)
values (
  '90000000-0000-0000-0000-000000000002',
  'Segundo Dirigente Teste',
  'M',
  'publicador'
);

-- Linha 1: casamento por responsible_2_member_id (mês atual).
insert into public.field_service_assignments (
  id, month, year, weekday, time, responsible, responsible_member_id,
  responsible_2, responsible_2_member_id, location, category
)
values (
  '90000000-0000-0000-0000-000000000010',
  extract(month from current_date)::int, extract(year from current_date)::int,
  'Segunda-feira', '08:45', 'Outro Dirigente', null,
  'Segundo Dirigente Teste', '90000000-0000-0000-0000-000000000002',
  'Salão do Reino', 'Segunda-feira'
);

-- Linha 2: casamento só por nome legado (responsible_2_member_id nulo, mês atual).
insert into public.field_service_assignments (
  id, month, year, weekday, time, responsible, responsible_member_id,
  responsible_2, responsible_2_member_id, location, category
)
values (
  '90000000-0000-0000-0000-000000000011',
  extract(month from current_date)::int, extract(year from current_date)::int,
  'Terça-feira', '16:30', 'Outro Dirigente', null,
  'Segundo Dirigente Teste', null,
  'Salão do Reino', 'Terça-feira'
);

-- Linha 3: mesmo membro, mas mês passado — deve ser preservada.
insert into public.field_service_assignments (
  id, month, year, weekday, time, responsible, responsible_member_id,
  responsible_2, responsible_2_member_id, location, category
)
values (
  '90000000-0000-0000-0000-000000000012',
  extract(month from (date_trunc('month', current_date) - interval '1 month'))::int,
  extract(year from (date_trunc('month', current_date) - interval '1 month'))::int,
  'Quarta-feira', '08:45', 'Outro Dirigente', null,
  'Segundo Dirigente Teste', '90000000-0000-0000-0000-000000000002',
  'Salão do Reino', 'Quarta-feira'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);

select is(
  (public.preview_member_transfer('90000000-0000-0000-0000-000000000002')).future_assignment_count,
  2::bigint,
  'preview counts both the ID-matched and the name-matched second-responsible slots, but not the past month'
);

create temporary table second_responsible_transfer_result as
select * from public.transfer_member(
  '90000000-0000-0000-0000-000000000002', current_date, 'Congregação Destino'
);

select is(
  (select removed_assignment_count from second_responsible_transfer_result),
  2::bigint,
  'transfer reports exactly the two future second-responsible slots as removed'
);

select results_eq(
  $$select responsible, responsible_member_id, responsible_2, responsible_2_member_id
    from public.field_service_assignments where id = '90000000-0000-0000-0000-000000000010'$$,
  $$values ('Outro Dirigente'::varchar, null::uuid, null::varchar, null::uuid)$$,
  'ID-matched second responsible is cleared to null while the first slot is untouched'
);

select results_eq(
  $$select responsible_2, responsible_2_member_id
    from public.field_service_assignments where id = '90000000-0000-0000-0000-000000000011'$$,
  $$values (null::varchar, null::uuid)$$,
  'name-only second responsible is audited and cleared to null'
);

select is(
  (select responsible_2_member_id from public.field_service_assignments where id = '90000000-0000-0000-0000-000000000012'),
  '90000000-0000-0000-0000-000000000002'::uuid,
  'past-month second responsible is preserved'
);

reset role;

select is(
  (
    select count(*)
    from public.member_transfer_assignment_audit a
    join second_responsible_transfer_result r on r.transfer_id = a.transfer_id
    where a.source_type = 'field_service_assignment'
      and a.slot_key = 'responsible_2'
      and a.role_label = 'Responsável'
  ),
  2::bigint,
  'both cleared second-responsible slots are audited under slot_key responsible_2'
);

select * from finish();

rollback;
