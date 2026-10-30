-- Tracked: RPCs, feed, busca e rankings

-- Tipo de retorno compartilhado por feed, perfil e página do item
create type public.review_card as (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  rating numeric,
  body text,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  media_item_id uuid,
  media_kind public.media_kind,
  media_external_id text,
  media_title text,
  media_artist_name text,
  media_cover_url text,
  likes_count bigint,
  comments_count bigint,
  liked_by_me boolean
);

-- security invoker: a RLS de reviews já esconde as reviews privadas.
-- Paginação keyset por (created_at, id) para não pular reviews com o mesmo timestamp.
create function public.list_reviews(
  p_user_id uuid default null,
  p_media_item_id uuid default null,
  p_following_only boolean default false,
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns setof public.review_card
language sql
stable
set search_path = ''
as $$
  select
    r.id, r.created_at, r.updated_at, r.rating, r.body,
    p.id, p.username::text, p.display_name, p.avatar_url,
    m.id, m.kind, m.external_id, m.title, m.artist_name, m.cover_url,
    (select count(*) from public.review_likes l where l.review_id = r.id),
    (select count(*) from public.review_comments c where c.review_id = r.id),
    exists (select 1 from public.review_likes l where l.review_id = r.id and l.user_id = auth.uid())
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  join public.media_items m on m.id = r.media_item_id
  where (p_user_id is null or r.user_id = p_user_id)
    and (p_media_item_id is null or r.media_item_id = p_media_item_id)
    and (
      not p_following_only
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = r.user_id
      )
    )
    and (
      p_cursor_ts is null
      or (r.created_at, r.id) < (p_cursor_ts, p_cursor_id)
    )
  order by r.created_at desc, r.id desc
  limit least(greatest(p_limit, 1), 50)
$$;

create function public.get_feed(
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns setof public.review_card
language sql
stable
set search_path = ''
as $$
  select * from public.list_reviews(
    p_following_only => true,
    p_cursor_ts => p_cursor_ts,
    p_cursor_id => p_cursor_id,
    p_limit => p_limit
  )
$$;

-- Upsert do snapshot do catálogo. Só contas (não visitantes). Dados só são
-- sobrescritos quando o registro tem mais de 30 dias.
create function public.ensure_media_item(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_kind public.media_kind := (p ->> 'kind')::public.media_kind;
  v_provider text := coalesce(p ->> 'provider', 'deezer');
begin
  if auth.uid() is null or public.is_guest() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.media_items (
    kind, provider, external_id, title, artist_name, artist_external_id,
    album_title, cover_url, release_date
  )
  values (
    v_kind, v_provider, p ->> 'external_id', p ->> 'title', p ->> 'artist_name',
    p ->> 'artist_external_id', p ->> 'album_title', p ->> 'cover_url',
    nullif(p ->> 'release_date', '')::date
  )
  on conflict (provider, kind, external_id) do update set
    title = excluded.title,
    artist_name = excluded.artist_name,
    artist_external_id = excluded.artist_external_id,
    album_title = excluded.album_title,
    cover_url = excluded.cover_url,
    release_date = excluded.release_date,
    updated_from_api_at = now()
  where public.media_items.updated_from_api_at < now() - interval '30 days'
  returning id into v_id;

  if v_id is null then
    select m.id into v_id
    from public.media_items m
    where m.provider = v_provider and m.kind = v_kind and m.external_id = p ->> 'external_id';
  end if;

  return v_id;
end
$$;

-- Token de push pode mudar de dono (troca de conta no mesmo aparelho).
create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_guest() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end
$$;

-- Sugestões para o Top 5: artistas mais bem avaliados pelo usuário.
create function public.suggest_favorite_artists(p_limit integer default 10)
returns table (
  artist_external_id text,
  artist_name text,
  avg_rating numeric,
  reviews_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    case when m.kind = 'artist' then m.external_id else m.artist_external_id end,
    max(case when m.kind = 'artist' then m.title else m.artist_name end),
    round(avg(r.rating), 2),
    count(*)
  from public.reviews r
  join public.media_items m on m.id = r.media_item_id
  where r.user_id = auth.uid()
    and case when m.kind = 'artist' then m.external_id else m.artist_external_id end is not null
  group by 1
  order by avg(r.rating) desc, count(*) desc
  limit least(greatest(p_limit, 1), 30)
$$;

-- chr(92) = barra invertida (escape do ILIKE)
create function public.search_users(p_query text, p_limit integer default 20)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
set search_path = ''
as $$
  with q as (
    select replace(
             replace(
               replace(btrim(p_query), chr(92), chr(92) || chr(92)),
               '%', chr(92) || '%'),
             '_', chr(92) || '_') as esc
  )
  select p.id, p.username::text, p.display_name, p.avatar_url
  from public.profiles p, q
  where char_length(btrim(p_query)) >= 2
    and p.username is not null
    and (
      p.username::text ilike '%' || q.esc || '%'
      or p.display_name ilike '%' || q.esc || '%'
    )
  order by (p.username::text ilike q.esc || '%') desc, p.username
  limit least(greatest(p_limit, 1), 50)
$$;

-- Rankings de mais bem avaliados (media bayesiana)
-- score = v/(v+m)*R + m/(v+m)*C, com m = 3 e minimo de 2 avaliacoes.
-- C e a media global da lista. So reviews entram (visitantes nao podem avaliar).
create materialized view public.rankings as
with direct as (
  select
    m.kind::text as list_kind,
    m.id::text as key,
    m.id as media_item_id,
    m.external_id,
    m.title,
    m.artist_name,
    m.cover_url,
    count(*)::int as votes,
    avg(r.rating) as avg_rating
  from public.reviews r
  join public.media_items m on m.id = r.media_item_id
  group by m.id
),
discography as (
  select
    'discography'::text as list_kind,
    'artist:' || m.artist_external_id as key,
    null::uuid as media_item_id,
    m.artist_external_id as external_id,
    max(m.artist_name) as title,
    null::text as artist_name,
    null::text as cover_url,
    count(*)::int as votes,
    avg(r.rating) as avg_rating
  from public.reviews r
  join public.media_items m on m.id = r.media_item_id
  where m.kind in ('track', 'album') and m.artist_external_id is not null
  group by m.artist_external_id
),
agg as (
  select * from direct
  union all
  select * from discography
),
list_avg as (
  select list_kind, sum(avg_rating * votes) / sum(votes) as c
  from agg
  group by list_kind
)
select
  agg.list_kind,
  agg.key,
  agg.media_item_id,
  agg.external_id,
  agg.title,
  agg.artist_name,
  agg.cover_url,
  agg.votes,
  round(agg.avg_rating, 2) as avg_rating,
  round(
    (agg.votes::numeric / (agg.votes + 3)) * agg.avg_rating
    + (3::numeric / (agg.votes + 3)) * list_avg.c,
    4
  ) as score
from agg
join list_avg using (list_kind)
where agg.votes >= 2;

create unique index rankings_key_idx on public.rankings (list_kind, key);
create index rankings_score_idx on public.rankings (list_kind, score desc);

revoke all on public.rankings from public, anon, authenticated;

create function public.get_rankings(
  p_list text,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  rank_position bigint,
  key text,
  media_item_id uuid,
  external_id text,
  title text,
  artist_name text,
  cover_url text,
  votes integer,
  avg_rating numeric,
  score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.rank_position, t.key, t.media_item_id, t.external_id, t.title,
         t.artist_name, t.cover_url, t.votes, t.avg_rating, t.score
  from (
    select
      row_number() over (order by g.score desc, g.votes desc, g.key) as rank_position,
      g.*
    from public.rankings g
    where g.list_kind = p_list and auth.uid() is not null
  ) t
  order by t.rank_position
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

create function public.refresh_rankings()
returns void
language sql
security definer
set search_path = ''
as $$
  refresh materialized view concurrently public.rankings;
$$;

-- Permissoes de execucao: nada para anon; refresh so para postgres e service_role.
revoke execute on function public.ensure_media_item(jsonb) from public, anon;
revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.get_rankings(text, integer, integer) from public, anon;
revoke execute on function public.refresh_rankings() from public, anon, authenticated;
revoke execute on function public.list_reviews(uuid, uuid, boolean, timestamptz, uuid, integer) from public, anon;
revoke execute on function public.get_feed(timestamptz, uuid, integer) from public, anon;
revoke execute on function public.suggest_favorite_artists(integer) from public, anon;
revoke execute on function public.search_users(text, integer) from public, anon;
