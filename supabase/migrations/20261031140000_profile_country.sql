-- Nacionalidade do perfil: código do país (ISO 3166-1 alfa-2, maiúsculo). A bandeira é
-- montada no app a partir do código. Nulo = não informado.
-- A política profiles_update_own já cobre a coluna: só o dono altera o próprio perfil.
alter table public.profiles
  add column country text
  constraint profiles_country_format check (country ~ '^[A-Z]{2}$');
