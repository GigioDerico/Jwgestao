-- Segundo dirigente opcional na saída de campo.
-- Espelha o par responsible/responsible_member_id já existente, seguindo o
-- padrão publisher1/publisher2 de cart_assignments.

alter table public.field_service_assignments
  add column if not exists responsible_2 varchar(255),
  add column if not exists responsible_2_member_id uuid references public.members(id);

-- O trigger de elegibilidade recebe nomes de coluna variádicos: basta recriá-lo
-- incluindo a nova coluna para que membros inelegíveis também sejam rejeitados
-- no segundo slot.
drop trigger if exists reject_ineligible_field_service_assignments
  on public.field_service_assignments;
create trigger reject_ineligible_field_service_assignments
before insert or update on public.field_service_assignments
for each row execute function private.reject_ineligible_assignment(
  'responsible_member_id',
  'responsible_2_member_id'
);
