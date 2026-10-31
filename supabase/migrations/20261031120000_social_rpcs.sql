-- Tracked F5: funcoes de apoio ao perfil, feed, comentarios e Top 5

-- Uma review no mesmo formato do feed (autor, item, contagens e se eu curti).
-- security invoker: a RLS de reviews esconde a review se o autor for privado.
create function public.get_review(p_review_id uuid)
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
  where r.id = p_review_id
$$;

-- Contadores do perfil numa chamada so. Reviews respeitam a RLS (perfil privado mostra 0).
create function public.get_profile_stats(p_user_id uuid)
returns table (followers bigint, following bigint, reviews bigint, is_following boolean)
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.follows f where f.following_id = p_user_id),
    (select count(*) from public.follows f where f.follower_id = p_user_id),
    (select count(*) from public.reviews r where r.user_id = p_user_id),
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p_user_id
    )
$$;

-- Quantos comentarios o usuario fez nas ultimas 24h e quantos pode fazer (visitante 3, conta 100).
create function public.comment_quota()
returns table (used integer, max_allowed integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)::integer from public.review_comments c
      where c.user_id = auth.uid() and c.created_at > now() - interval '24 hours'
    ),
    case when public.is_guest() then 3 else 100 end
$$;

-- Troca o Top 5 inteiro de uma vez (a ordem do array vira a posicao 1..5).
create function public.set_favorite_artists(p_media_item_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if public.is_guest() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(array_length(p_media_item_ids, 1), 0) > 5 then
    raise exception 'at most 5 artists' using errcode = '22023';
  end if;

  delete from public.favorite_artists where user_id = auth.uid();

  insert into public.favorite_artists (user_id, media_item_id, position)
  select auth.uid(), t.item_id, t.ord::smallint
  from unnest(p_media_item_ids) with ordinality as t(item_id, ord);
end
$$;

revoke execute on function public.get_review(uuid) from public, anon;
revoke execute on function public.get_profile_stats(uuid) from public, anon;
revoke execute on function public.comment_quota() from public, anon;
revoke execute on function public.set_favorite_artists(uuid[]) from public, anon;
