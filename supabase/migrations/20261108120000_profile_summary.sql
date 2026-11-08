-- Resumo do perfil: quanto a pessoa avaliou de cada tipo e o artista que ela mais avaliou.
-- Roda com as permissões de quem consulta (sem security definer): a RLS de reviews esconde as
-- reviews privadas, então o resumo de quem as escondeu sai zerado para os outros.
create function public.get_profile_summary(p_user_id uuid)
returns table (
  tracks bigint,
  albums bigint,
  artists bigint,
  top_artist_external_id text,
  top_artist_name text,
  top_artist_reviews bigint
)
language sql
stable
set search_path = ''
as $$
  with mine as (
    select
      m.kind,
      case when m.kind = 'artist' then m.external_id else m.artist_external_id end as artist_ext,
      case when m.kind = 'artist' then m.title else m.artist_name end as artist_name,
      r.created_at
    from public.reviews r
    join public.media_items m on m.id = r.media_item_id
    where r.user_id = p_user_id
  ),
  -- Artista com mais avaliações (faixas, álbuns e o próprio artista). Empate: o avaliado mais recentemente.
  top as (
    select artist_ext, max(artist_name) as artist_name, count(*) as n
    from mine
    where artist_ext is not null
    group by artist_ext
    order by count(*) desc, max(created_at) desc
    limit 1
  )
  select
    (select count(*) from mine where kind = 'track'),
    (select count(*) from mine where kind = 'album'),
    (select count(*) from mine where kind = 'artist'),
    (select artist_ext from top),
    (select artist_name from top),
    (select n from top)
$$;

revoke execute on function public.get_profile_summary(uuid) from public, anon;
