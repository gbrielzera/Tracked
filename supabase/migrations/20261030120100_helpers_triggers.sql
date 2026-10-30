-- Tracked: helpers e triggers

-- Visitante = usuário do login anônimo (claim is_anonymous no JWT).
create function public.is_guest()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- Reviews de um autor são visíveis ao dono ou se o autor não ativou reviews_private.
create function public.can_view_reviews_of(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = p_author and not p.reviews_private
    )
$$;

-- Perfil criado automaticamente no signup (conta ou visitante) ---------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if new.is_anonymous then
    v_name := 'Visitante ' || lpad(floor(random() * 10000)::int::text, 4, '0');
  else
    v_name := coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    );
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 50));
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- reviews: updated_at, imutabilidade das chaves e média do item ----------------------
create function public.reviews_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id or new.media_item_id <> old.media_item_id then
    raise exception 'user_id e media_item_id não podem ser alterados';
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger reviews_before_update
  before update on public.reviews
  for each row execute function public.reviews_before_update();

create function public.refresh_media_rating(p_media uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.media_items m
  set avg_rating = (select round(avg(r.rating), 2) from public.reviews r where r.media_item_id = p_media),
      ratings_count = (select count(*) from public.reviews r where r.media_item_id = p_media)
  where m.id = p_media;
$$;

revoke execute on function public.refresh_media_rating(uuid) from public, anon, authenticated;

create function public.reviews_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_media_rating(old.media_item_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_media_rating(new.media_item_id);
  end if;
  return null;
end
$$;

create trigger reviews_after_change
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_after_change();

-- favorite_artists: só itens do tipo artista ---------------------------------------
create function public.favorite_artists_check_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.media_items m
    where m.id = new.media_item_id and m.kind = 'artist'
  ) then
    raise exception 'favorite_artists aceita apenas itens do tipo artist';
  end if;
  return new;
end
$$;

create trigger favorite_artists_check_kind
  before insert or update on public.favorite_artists
  for each row execute function public.favorite_artists_check_kind();

-- limite de comentários em 24h: visitante 3, conta 100 ---------------------------------
create function public.enforce_comment_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  v_limit := case when public.is_guest() then 3 else 100 end;

  select count(*) into v_count
  from public.review_comments c
  where c.user_id = new.user_id and c.created_at > now() - interval '24 hours';

  if v_count >= v_limit then
    raise exception 'comment_limit' using errcode = 'P0001', detail = v_limit::text;
  end if;
  return new;
end
$$;

create trigger enforce_comment_limit
  before insert on public.review_comments
  for each row execute function public.enforce_comment_limit();

-- notificações (criadas só por triggers) ---------------------------------------------
create function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow')
  on conflict do nothing;
  return null;
end
$$;

create trigger notify_follow
  after insert on public.follows
  for each row execute function public.notify_follow();

create function public.unnotify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where type = 'follow' and recipient_id = old.following_id and actor_id = old.follower_id;
  return null;
end
$$;

create trigger unnotify_follow
  after delete on public.follows
  for each row execute function public.unnotify_follow();

create function public.notify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select r.user_id into v_owner from public.reviews r where r.id = new.review_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, review_id)
    values (v_owner, new.user_id, 'like', new.review_id)
    on conflict do nothing;
  end if;
  return null;
end
$$;

create trigger notify_like
  after insert on public.review_likes
  for each row execute function public.notify_like();

create function public.unnotify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where type = 'like' and actor_id = old.user_id and review_id = old.review_id;
  return null;
end
$$;

create trigger unnotify_like
  after delete on public.review_likes
  for each row execute function public.unnotify_like();

create function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select r.user_id into v_owner from public.reviews r where r.id = new.review_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, review_id, comment_id)
    values (v_owner, new.user_id, 'comment', new.review_id, new.id);
  end if;
  return null;
end
$$;

create trigger notify_comment
  after insert on public.review_comments
  for each row execute function public.notify_comment();
