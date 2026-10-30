-- Tracked: Row Level Security
-- Visitantes (login anônimo) têm a role `authenticated`; por isso as escritas
-- restritas a contas usam `not public.is_guest()`.

alter table public.profiles enable row level security;
alter table public.media_items enable row level security;
alter table public.reviews enable row level security;
alter table public.favorite_artists enable row level security;
alter table public.follows enable row level security;
alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- media_items (escrita só via RPC ensure_media_item / service role)
create policy media_items_select on public.media_items
  for select to authenticated using (true);

-- reviews: privacidade garantida aqui (reviews_private)
create policy reviews_select on public.reviews
  for select to authenticated using (public.can_view_reviews_of(user_id));
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_guest());
create policy reviews_update on public.reviews
  for update to authenticated
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid() and not public.is_guest());
create policy reviews_delete on public.reviews
  for delete to authenticated using (user_id = auth.uid());

-- favorite_artists
create policy favorite_artists_select on public.favorite_artists
  for select to authenticated using (true);
create policy favorite_artists_insert on public.favorite_artists
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_guest());
create policy favorite_artists_update on public.favorite_artists
  for update to authenticated
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid() and not public.is_guest());
create policy favorite_artists_delete on public.favorite_artists
  for delete to authenticated using (user_id = auth.uid());

-- follows
create policy follows_select on public.follows
  for select to authenticated using (true);
create policy follows_insert on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid() and not public.is_guest());
create policy follows_delete on public.follows
  for delete to authenticated using (follower_id = auth.uid());

-- review_likes: herdam a visibilidade da review (RLS de reviews vale na subconsulta)
create policy review_likes_select on public.review_likes
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
create policy review_likes_insert on public.review_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_guest()
    and exists (select 1 from public.reviews r where r.id = review_id)
  );
create policy review_likes_delete on public.review_likes
  for delete to authenticated using (user_id = auth.uid());

-- review_comments: visitante pode comentar (limite no trigger enforce_comment_limit)
create policy review_comments_select on public.review_comments
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
create policy review_comments_insert on public.review_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.reviews r where r.id = review_id)
  );
create policy review_comments_delete on public.review_comments
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.reviews r
      where r.id = review_id and r.user_id = auth.uid()
    )
  );

-- notifications: dono lê, marca como lida e apaga; inserção só por trigger
create policy notifications_select on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_delete on public.notifications
  for delete to authenticated using (recipient_id = auth.uid());

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- push_tokens (visitantes não recebem push)
create policy push_tokens_select on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy push_tokens_insert on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_guest());
create policy push_tokens_update on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_delete on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- reports: qualquer autenticado (inclusive visitante) denuncia; lê só as próprias
create policy reports_select on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- Sem login (role anon) nada é acessível: remove os grants padrão do Supabase.
revoke all on all tables in schema public from anon;
