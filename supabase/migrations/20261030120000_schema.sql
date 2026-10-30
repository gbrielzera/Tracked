-- Tracked: schema base (tabelas, enums, índices)

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.media_kind as enum ('track', 'album', 'artist');
create type public.notification_type as enum ('follow', 'like', 'comment');

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique
    check (username::text ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  bio text check (char_length(bio) <= 160),
  reviews_private boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_username_trgm on public.profiles
  using gin ((username::text) extensions.gin_trgm_ops);
create index profiles_display_name_trgm on public.profiles
  using gin (display_name extensions.gin_trgm_ops);

-- media_items: snapshot mínimo do catálogo externo ------------------------------
create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null,
  provider text not null default 'deezer',
  external_id text not null check (char_length(external_id) <= 64),
  title text not null check (char_length(title) <= 300),
  artist_name text check (char_length(artist_name) <= 300),
  artist_external_id text check (char_length(artist_external_id) <= 64),
  album_title text check (char_length(album_title) <= 300),
  cover_url text check (char_length(cover_url) <= 500),
  release_date date,
  info jsonb,
  info_fetched_at timestamptz,
  updated_from_api_at timestamptz not null default now(),
  avg_rating numeric(3, 2),
  ratings_count integer not null default 0,
  unique (provider, kind, external_id)
);

create index media_items_artist_idx on public.media_items (artist_external_id)
  where artist_external_id is not null;

-- reviews -------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  rating numeric(2, 1) not null
    check (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2)),
  body text check (char_length(body) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_item_id)
);

create index reviews_user_idx on public.reviews (user_id, created_at desc, id desc);
create index reviews_media_idx on public.reviews (media_item_id, created_at desc, id desc);
create index reviews_created_idx on public.reviews (created_at desc, id desc);

-- favorite_artists (top 5) ------------------------------------------------------
create table public.favorite_artists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  primary key (user_id, position),
  unique (user_id, media_item_id)
);

-- follows -------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

-- likes e comentários -------------------------------------------------------------
create table public.review_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create index review_likes_review_idx on public.review_likes (review_id);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index review_comments_review_idx on public.review_comments (review_id, created_at);
create index review_comments_user_idx on public.review_comments (user_id, created_at desc);

-- notificações e push -----------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  review_id uuid references public.reviews (id) on delete cascade,
  comment_id uuid references public.review_comments (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create unique index notifications_follow_uniq
  on public.notifications (recipient_id, actor_id) where type = 'follow';
create unique index notifications_like_uniq
  on public.notifications (recipient_id, actor_id, review_id) where type = 'like';

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- denúncias -----------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete cascade,
  comment_id uuid references public.review_comments (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  check (num_nonnulls(review_id, comment_id) = 1)
);
