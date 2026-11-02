-- "Músicas do momento": 5 músicas no perfil, no mesmo esquema dos 5 artistas favoritos.
-- Tabela própria (a de artistas já está em uso), com as mesmas regras de acesso.

create table public.favorite_tracks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  primary key (user_id, position),
  unique (user_id, media_item_id)
);

-- só itens do tipo música
create function public.favorite_tracks_check_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.media_items m
    where m.id = new.media_item_id and m.kind = 'track'
  ) then
    raise exception 'favorite_tracks aceita apenas itens do tipo track';
  end if;
  return new;
end
$$;

create trigger favorite_tracks_check_kind
  before insert or update on public.favorite_tracks
  for each row execute function public.favorite_tracks_check_kind();

-- RLS: todos leem; só contas (não visitantes) escrevem, e só o próprio Top 5
alter table public.favorite_tracks enable row level security;

create policy favorite_tracks_select on public.favorite_tracks
  for select to authenticated using (true);
create policy favorite_tracks_insert on public.favorite_tracks
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_guest());
create policy favorite_tracks_update on public.favorite_tracks
  for update to authenticated
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid() and not public.is_guest());
create policy favorite_tracks_delete on public.favorite_tracks
  for delete to authenticated using (user_id = auth.uid());

-- Sem login (role anon) nada é acessível: tabelas novas recebem o grant padrão do Supabase,
-- que a migration de RLS só removeu das tabelas que já existiam.
revoke all on public.favorite_tracks from anon;

-- Troca a lista inteira de uma vez (a ordem do array vira a posição 1..5).
create function public.set_favorite_tracks(p_media_item_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if public.is_guest() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(array_length(p_media_item_ids, 1), 0) > 5 then
    raise exception 'at most 5 tracks' using errcode = '22023';
  end if;

  delete from public.favorite_tracks where user_id = auth.uid();

  insert into public.favorite_tracks (user_id, media_item_id, position)
  select auth.uid(), t.item_id, t.ord::smallint
  from unnest(p_media_item_ids) with ordinality as t(item_id, ord);
end
$$;

-- Sugestões: as músicas que o usuário mais bem avaliou (empate: a mais recente primeiro).
create function public.suggest_favorite_tracks(p_limit integer default 10)
returns table (
  track_external_id text,
  title text,
  artist_name text,
  cover_url text,
  rating numeric
)
language sql
stable
set search_path = ''
as $$
  select m.external_id, m.title, m.artist_name, m.cover_url, r.rating
  from public.reviews r
  join public.media_items m on m.id = r.media_item_id
  where r.user_id = auth.uid() and m.kind = 'track'
  order by r.rating desc, r.created_at desc
  limit least(greatest(p_limit, 1), 30)
$$;

revoke execute on function public.set_favorite_tracks(uuid[]) from public, anon;
revoke execute on function public.suggest_favorite_tracks(integer) from public, anon;
