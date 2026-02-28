alter table public.members
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip_code text;
