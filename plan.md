# Plano — Tracked (app de reviews de músicas, estilo Letterboxd)

## Contexto
O usuário quer um app mobile (iOS + Android), em React Native, para avaliar músicas, álbuns e
artistas, com uma camada social (perfil, seguir, feed, curtidas, comentários). O app não toca
músicas. Tudo tem que ser gratuito. A primeira entrega é acadêmica (8º semestre), mas pode
virar produto real depois. O processo segue `.claude/planner.md`: **não se gera código até a
frase exata "AUTORIZAR CODIFICAÇÃO"**. Depois que este plano for aprovado, o primeiro passo é
salvá-lo como `plan.md` na raiz do projeto (`Programação de App/plan.md`), seguindo a estrutura
exigida (Seções 1–5 abaixo).

### Decisões confirmadas com o usuário
| Tema | Decisão |
|---|---|
| Backend | Supabase (Postgres + Auth + Storage + RLS + Realtime + Edge Functions) |
| Review | 1 por usuário por item, editável; nota de 0,5 a 5 em meias estrelas; texto opcional |
| Privacidade | Chave global `reviews_private` no perfil. Ligada, nenhuma review do usuário aparece para terceiros |
| Login | E-mail/senha + Google |
| Top 5 artistas | Escolha manual e reordenável, com sugestões vindas das reviews enquanto estiver vazio |
| Social v1 | Seguir, curtir, comentar, buscar usuários, notificações |
| Trending | Só global |
| Notificações | In-app (tempo real) + push |
| Entrega | Acadêmica (Expo Go/APK); arquitetura pronta para evoluir |
| Visitante | Login anônimo do Supabase: navega (Trending, Pesquisa, detalhes, reviews públicas) e **comenta** com limite diário. Não avalia, não curte, não segue. Pode virar conta depois, mantendo os comentários |
| Rankings | Dentro da aba Trending: seletor "Em alta" (Deezer) / "Mais bem avaliados" (comunidade). Só contam usuários com conta |
| Ranking de artistas | Dois separados: "Artistas mais bem avaliados" (reviews diretas) e "Melhor discografia" (média das faixas/álbuns) |
| Front-end | Usar a skill `frontend-design@claude-plugins-official` nas telas (F4–F6) |

### Identidade e infraestrutura
| Item | Valor |
|---|---|
| Nome do app | **Tracked** |
| Expo `slug` / `scheme` (deep link do OAuth) | `tracked` / `tracked://` |
| Bundle ID iOS / package Android | `com.gbrielzera.tracked` (definitivo depois da publicação, confirmar antes da F0) |
| Repositório | https://github.com/gbrielzera/Tracked.git (o código fica na raiz do repo) |
| Supabase | projeto `utzuyvaroyjmaullrbzy` → `https://utzuyvaroyjmaullrbzy.supabase.co` |
| Expo | conta existente do usuário (EAS Build) |

### Política de segredos (nunca no repositório)
- `.env` local (no `.gitignore`) com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  A anon key é pública por design (vai dentro do APK); a segurança vem da RLS. Mesmo assim fica
  fora do git, por higiene. O repo inclui um `.env.example` com os valores vazios.
- **Last.fm API key**: só como secret da Edge Function (`supabase secrets set LASTFM_API_KEY=...`).
  Nunca no app nem no git.
- **Last.fm shared secret**: não é usado (só serve para login/scrobble). Não deve ser guardado em lugar nenhum.
- **Service role key** do Supabase: só nos secrets das Edge Functions; jamais no app.

---

## 1. Visão Geral
"Letterboxd para música". O usuário pesquisa qualquer faixa, álbum ou artista do catálogo
mundial do Deezer, dá a nota e escreve uma review. O perfil público mostra foto, nome exibido,
@, os 5 artistas favoritos, contagem de seguidores e as reviews (se não estiverem privadas).
Barra inferior com 4 abas: **Feed** (reviews de quem você segue), **Trending** (top global),
**Pesquisa** (músicas/álbuns/artistas/usuários) e **Perfil**.

## 2. Arquitetura e Stack

### Viabilidade das APIs (custo zero)
| Necessidade | Fonte | Observações |
|---|---|---|
| Busca, detalhes, capas, data de lançamento, faixas do álbum, top do artista | **Deezer API pública** (`api.deezer.com`) | Leitura sem chave; ~50 req/5s por IP; chamada direto do app |
| Trending global | **Deezer `GET /chart/0/tracks`** (+ `/chart/0/albums`) | Gratuito, sem chave |
| Descrição curta (bio do artista, wiki da faixa/álbum) | **Last.fm API** (`artist.getInfo`, `track.getInfo`, `album.getInfo`) | Chave gratuita, uso **não comercial**; chamada só via Edge Function (a chave fica escondida) |
| Fallback (opcional) | iTunes Search API / MusicBrainz + Cover Art Archive | Sem chave |
| **Não usar** | Spotify Web API | Apps novos ficam em "development mode" (limite de usuários, endpoints removidos) |

Risco para a fase "produto real": os termos do Last.fm (não comercial) e do Deezer (exige
atribuição). Se o app virar comercial, trocar para MusicBrainz (CC0) e Wikipedia. Fica isolado
pela camada `MusicProvider` (abaixo).

### Stack do app
- **Expo** (SDK estável mais recente) + **TypeScript** + **Expo Router** (rotas por arquivo, tabs).
- **TanStack Query** para o estado de servidor (cache, paginação infinita, updates otimistas).
- **Zustand** só para o estado de sessão e UI. Nada de dados de servidor no Zustand.
- `@supabase/supabase-js` com sessão em `expo-secure-store`.
- `expo-image` (cache de capas), `@shopify/flash-list` (listas longas),
  `react-hook-form` + `zod` (formulários), `expo-image-picker` + `expo-image-manipulator`
  (avatar redimensionado para 512px antes do upload), `expo-auth-session`/`expo-web-browser`
  (Google OAuth), `expo-notifications` (push).
- **Build:** Expo Go para o dia a dia; **EAS Build (free tier)** gera o *development build* e o
  APK. Push e deep link do OAuth exigem development build. No iOS, instalar build própria em
  aparelho exige a conta Apple paga, então o iOS fica testado via Expo Go (sem push).

### Backend (Supabase free)
- Postgres com **RLS em todas as tabelas**. A privacidade é garantida no banco, não no app.
- Auth: e-mail/senha (confirmação + reset de senha) e Google OAuth.
- Storage: bucket `avatars` (público para leitura; escrita só em `{uid}/*`).
- Realtime: canal em `notifications` filtrado por `recipient_id`.
- Edge Functions: `music-info` (proxy e cache do Last.fm) e `send-push` (disparada por Database
  Webhook no insert de `notifications`, envia via Expo Push API).
- Limites: 500 MB de DB, 1 GB de storage, pausa após 7 dias sem uso (reativar antes das demos).

### Padrões e estrutura de pastas
Rotas por arquivo + módulos por feature + camada de adaptadores para APIs externas.
```
app/
  (auth)/login.tsx, signup.tsx, forgot-password.tsx, onboarding.tsx
  (tabs)/_layout.tsx, feed.tsx, trending.tsx, search.tsx, profile.tsx
  track/[id].tsx  album/[id].tsx  artist/[id].tsx
  user/[username].tsx  user/[username]/followers.tsx, following.tsx
  review/[id].tsx  notifications.tsx  settings/edit-profile.tsx, favorites.tsx
src/
  services/music/   MusicProvider.ts (interface), deezer.ts, lastfm.ts, types.ts (Track/Album/Artist normalizados)
  services/supabase/ client.ts, database.types.ts (gerado)
  features/{auth,reviews,social,profile,notifications,trending,search}/ (hooks de query + componentes da feature)
  components/       StarRating, ReviewCard, MediaHeader, Avatar, EmptyState, ErrorState
  lib/              format, debounce, constants
supabase/migrations/  supabase/functions/{music-info,send-push}/
```

## 3. Modelagem e Dados

### Tabelas (Postgres)
- **profiles**: `id uuid PK → auth.users`, `username citext UNIQUE` (regex `^[a-z0-9_.]{3,20}$`),
  `display_name`, `avatar_url`, `bio` (≤160), `reviews_private bool default false`, `created_at`.
  Criada por trigger `on auth.users insert`. Username definido no onboarding.
- **media_items**: snapshot mínimo do catálogo externo, usado no feed e no perfil sem chamar a API.
  `id uuid PK`, `kind enum(track,album,artist)`, `provider text default 'deezer'`, `external_id text`,
  `title`, `artist_name`, `album_title`, `cover_url`, `release_date`, `info jsonb` (cache do
  Last.fm + `info_fetched_at`), `updated_from_api_at timestamptz`, `avg_rating numeric(3,2)`,
  `ratings_count int`. `UNIQUE(provider, kind, external_id)`. Upsert via RPC
  `ensure_media_item(snapshot)` (security definer).
  **Atualização de dados velhos:** o Postgres não chama o Deezer. Quem traz os dados novos é o
  cliente, que sempre busca o Deezer ao vivo ao abrir um detalhe e manda esse snapshot para
  `ensure_media_item`. O RPC insere o registro se ele não existir e só sobrescreve título, capa
  etc. quando `updated_from_api_at < now() - 30 days`. Isso mantém o banco atualizado de graça, sem
  `pg_net`, e os itens vistos com frequência se renovam sozinhos.
- **reviews**: `id`, `user_id → profiles`, `media_item_id → media_items`,
  `rating numeric(2,1)` CHECK `rating BETWEEN 0.5 AND 5 AND rating*2 = trunc(rating*2)`,
  `body text` (≤5000, opcional), `created_at`, `updated_at`. `UNIQUE(user_id, media_item_id)`.
  Índices: `(user_id, created_at desc)`, `(media_item_id, created_at desc)`.
- **favorite_artists**: `user_id`, `media_item_id` (kind = artist), `position 1..5`.
  `PK(user_id, position)`, `UNIQUE(user_id, media_item_id)`.
- **follows**: `follower_id`, `following_id`, `created_at`. `PK(follower_id, following_id)`, CHECK diferentes.
  Índice `(following_id)`.
- **review_likes**: `PK(user_id, review_id)`, `created_at`.
- **review_comments**: `id`, `review_id`, `user_id`, `body` (1–1000), `created_at`.
- **notifications**: `id`, `recipient_id`, `actor_id`, `type enum(follow,like,comment)`,
  `review_id?`, `comment_id?`, `read_at?`, `created_at`. Criadas **só por triggers** em
  follows/likes/comments (nunca notifica a si mesmo; deduplica likes repetidos).
- **push_tokens**: `token PK`, `user_id`, `platform`, `updated_at`.
- **reports** (denúncias): `id`, `reporter_id`, `review_id?`, `comment_id?`, `reason`, `created_at`.
  CHECK de exatamente um alvo. Moderação manual pelo dashboard do Supabase na v1.

### Visitantes (login anônimo)
- `supabase.auth.signInAnonymously()` cria um usuário real com `is_anonymous = true` no JWT. O
  trigger de signup cria o `profiles` com `username = null` e `display_name = 'Visitante'`
  (+ 4 dígitos). `username` passa a aceitar null, mas o onboarding continua obrigatório para conta.
- Helper SQL `is_guest()` = `coalesce((auth.jwt()->>'is_anonymous')::boolean, false)`.
- **Limite de comentários**: trigger `before insert` em `review_comments` conta os comentários do
  autor nas últimas 24h. Visitante: máx. **3/dia**. Conta: máx. 100/dia (anti-spam). Estourou → erro
  `P0001 'comment_limit'`, que a UI traduz.
- Proteção extra: rate limit nativo do Supabase para criação de anônimos por IP (padrão 30/h).
  Contas anônimas sem atividade há 30 dias são removidas por um job `pg_cron`.
- **Promover para conta**: `updateUser({ email, password })` ou `linkIdentity` (Google). O `uid` é o
  mesmo, então os comentários continuam dele; em seguida ele passa pelo onboarding (@).

### Regras RLS (essenciais)
- `profiles`: SELECT para todos os autenticados; UPDATE só no próprio.
- `reviews`: SELECT se `user_id = auth.uid()` **ou** o autor tem `reviews_private = false`.
  INSERT/UPDATE/DELETE só nas próprias.
- `review_likes` / `review_comments`: SELECT e INSERT só se a review-pai for visível (mesma
  condição). DELETE só do próprio.
- `follows`: SELECT para todos; INSERT/DELETE com `follower_id = auth.uid()`.
- `favorite_artists`: SELECT para todos; escrita só do próprio.
- `notifications`, `push_tokens`: só o dono lê/atualiza; INSERT só via trigger/security definer.
- `media_items`: SELECT para todos; escrita só via RPC.
- **Visitantes**: todo INSERT/UPDATE em `reviews`, `review_likes`, `follows`, `favorite_artists`
  e `push_tokens` exige `NOT is_guest()`. Em `review_comments` e `reports`, o visitante pode inserir.
- `reports`: INSERT por qualquer autenticado (inclusive visitante); SELECT só pelo próprio denunciante.

### Lógica derivada
- **Média do item**: trigger em `reviews` recalcula `avg_rating`/`ratings_count`. A média é
  anônima, então inclui reviews privadas (não revela identidade).
- **Feed**: RPC `get_feed(cursor_ts timestamptz, cursor_id uuid, limit int)`. Junta reviews com
  follows em `follower_id = auth.uid()`, faz `ORDER BY created_at DESC, id DESC` e pagina por keyset
  com tupla: `WHERE (created_at, id) < (cursor_ts, cursor_id)`. Assim reviews com o mesmo
  timestamp não são puladas. O índice `(created_at desc, id desc)` cobre a consulta. O mesmo
  padrão vale para as listas de reviews do perfil e do item. A RLS já remove as privadas. Retorna o autor, o media_item e as contagens de likes/comentários
  e se eu curti.
- **Rankings "Mais bem avaliados"**: *materialized view* `rankings` atualizada **a cada hora**
  via `pg_cron` (+ refresh manual por RPC para a demo). Usa só reviews (que visitantes não podem
  criar, então só contas entram). Comentários não influenciam a nota.
  - Nota ponderada (média bayesiana): `score = (v/(v+m))·R + (m/(v+m))·C`, em que `v` é o número de
    reviews do item, `R` a média do item, `C` a média global do tipo (faixa/álbum/artista) e `m` o
    mínimo de votos (configurável; começa em 3). Exige `v ≥ 2` para entrar.
  - Listas: Músicas, Álbuns, **Artistas mais bem avaliados** (reviews diretas, kind = artist) e
    **Melhor discografia** (média das reviews de faixas e álbuns agrupadas por artista). Para agrupar,
    `media_items` ganha `artist_external_id` (preenchido no snapshot do Deezer).
  - RPC `get_rankings(kind, limit, offset)` lê da view (índice por `kind, score desc`).
- **Sugestões do Top 5**: RPC que agrupa as reviews do usuário por artista (kind artist ou
  `artist_name` das faixas/álbuns) e ordena por média e quantidade.
- **Busca de usuários**: `ILIKE` em `username`/`display_name` com índice `pg_trgm`.

### Fluxo de review (item externo → banco)
Tela de detalhe (dados ao vivo do Deezer) → usuário salva nota/texto → `ensure_media_item` (upsert
do snapshot) → upsert em `reviews` (onConflict `user_id,media_item_id`) → invalida as queries de
item, perfil e feed.

### Estado no app
- TanStack Query keys: `['deezer', kind, id]` (staleTime 24h), `['chart']` (1h),
  `['search', type, q]` (busca **só ao enviar**: tecla Enter/botão "Buscar", mínimo 2 caracteres), `['feed']` (infinite),
  `['profile', username]`, `['reviews', 'user', id]`, `['reviews', 'item', mediaId]`, `['notifications']`.
- Updates otimistas em likes, follow e salvar review. Rollback em caso de erro.
- Zustand: `session`, `profile` atual, contador de notificações não lidas (alimentado pelo Realtime).

### Desempenho, erros e segurança
- **Rate limit do Deezer (50 req/5s por IP público — risco real numa demo no Wi-Fi da faculdade):**
  - Busca só ao enviar (Enter/botão), sem consulta a cada tecla. Trocar de segmento reaproveita o cache.
  - O cache do Query evita refetch (detalhe 24h, chart 1h, busca 10min) e a paginação é sob demanda.
  - O Deezer responde **HTTP 200 com `{error:{code:4}}`** quando estoura a cota. O adaptador trata
    isso como erro e tenta de novo com backoff exponencial + jitter (máx. 3 tentativas). Na UI
    aparece "muitas buscas, tente em instantes".
  - Não passar o Deezer por Edge Function: todos os usuários sairiam pelos mesmos IPs do Supabase
    e o gargalo pioraria.
  - Last.fm em cache no `media_items.info` (renovado a cada 30 dias).
- Toda tela tem estado de loading (skeleton), vazio e erro com "tentar novamente". Se o Last.fm
  falhar, só some a descrição.
- O HTML do Last.fm é removido e a atribuição "via Last.fm" é exibida. A atribuição do Deezer
  fica no detalhe.
- Chave do Last.fm só nos secrets da Edge Function. A anon key é pública por design e protegida pela RLS.
- Limites de tamanho de texto checados no banco e no zod.
- **Storage sem arquivos órfãos:** o avatar fica num caminho fixo `avatars/{uid}/avatar.jpg`
  (upload com `upsert`; `avatar_url` leva `?v=<timestamp>` para quebrar o cache). Trocar a foto
  não deixa sobras. Exclusão de conta (exigida pelas lojas no futuro) é a **Edge Function
  `delete-account`** (service role, valida o JWT do chamador): 1) lista e remove
  `avatars/{uid}/*` do Storage; 2) `auth.admin.deleteUser(uid)`, e o cascade apaga profile,
  reviews, likes etc. A ordem garante que nenhum arquivo fique sem dono no banco.

## 4. Fases de Execução (tarefas atômicas)
**F0 Setup**
1. `git init` ligado ao remoto `gbrielzera/Tracked` + `.gitignore` (incluindo `.env`) e `.env.example`. Criar o projeto Expo "Tracked" (TS + Expo Router, `scheme: tracked`), ESLint/Prettier, aliases `@/`, tema (dark, estilo Letterboxd) e as 4 tabs com telas placeholder.
2. Criar o projeto Supabase, `supabase` CLI local, `.env` (`EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`) e o cliente com SecureStore.

**F1 Banco**
3. Migration: enums, tabelas, constraints e índices (Seção 3).
4. Migration: políticas RLS de todas as tabelas.
5. Migration: triggers (profile no signup — inclusive visitante, médias, notificações, limite de comentários) e RPCs (`ensure_media_item` com regra de 30 dias, `get_feed` com cursor `(created_at,id)`, `suggest_favorite_artists`, `search_users`).
5b. Migration: helper `is_guest()` aplicado nas políticas, tabela `reports`, materialized view `rankings` + RPC `get_rankings` + jobs `pg_cron` (refresh hourly, limpeza de anônimos inativos). Ativar "Anonymous sign-ins" no dashboard.
6. Bucket `avatars` (caminho fixo por uid) + policies; Edge Function `delete-account`; gerar `database.types.ts`.

**F2 Autenticação** (validar no APK desde o início, não só na F7)
7. Telas de login, cadastro e esqueci a senha (e-mail/senha) + guarda de rotas por sessão.
8. Google OAuth: `scheme` definido no `app.json`; cliente Supabase com `flowType: 'pkce'` e
   `detectSessionInUrl: false`; `makeRedirectUri({ scheme })` cadastrado na allowlist de Redirect
   URLs do Supabase; `WebBrowser.openAuthSessionAsync` → extrair `code` da URL de retorno →
   `exchangeCodeForSession`; listener `Linking` como fallback quando o app volta "frio"; um único
   `onAuthStateChange` (no root layout) alimenta o Zustand e a guarda de rotas.
   **Smoke test obrigatório nesta tarefa:** gerar o development build/APK no EAS e fazer o login
   Google num Android físico (app aberto e app fechado) + Expo Go no iOS. A F2 só fecha com isso passando.
9. Onboarding obrigatório: @ único (validação ao vivo), nome exibido e foto.
9b. Tela de boas-vindas: "Entrar", "Criar conta", "Continuar como visitante". Guarda de rotas:
    o visitante acessa Trending, Pesquisa e detalhes; Feed, Perfil, avaliar, curtir e seguir mostram
    um convite para criar conta. Fluxo "promover visitante para conta" (e-mail ou Google) → onboarding.

**F3 Camada de música**
10. Interface `MusicProvider` + tipos normalizados + adaptador Deezer (search por tipo, track, album+tracks, artist+top+albums, chart).
11. Edge Function `music-info` (Last.fm getInfo + cache em `media_items.info`) + hook cliente.

**F4 Telas de catálogo**
12. Componente `StarRating` (meia estrela por toque/arraste, modo leitura, acessível).
13. Trending com seletor "Em alta" (chart global do Deezer, faixas/álbuns) e "Mais bem avaliados" (sub-abas Músicas, Álbuns, Artistas, Melhor discografia, via `get_rankings`, mostrando nota ponderada e nº de avaliações) → detalhe.
14. Pesquisa: segmentos Músicas/Álbuns/Artistas/Usuários, busca por envio (Enter/botão), paginação sob demanda e tratamento do erro de cota do Deezer (código 4).
15. Detalhe da faixa: capa, artista, álbum (link), lançamento, duração, descrição, média, formulário da minha review e reviews de outros.
16. Detalhe do álbum: mesmo padrão + lista de faixas (link para cada uma).
17. Detalhe do artista: mesmo padrão + top faixas + álbuns.
18. Fluxo de salvar/editar/excluir review (Seção 3).

**F5 Social**
19. Perfil (próprio e de terceiros): header, Top 5, contadores e lista de reviews (ou um aviso "reviews privadas").
20. Editar perfil: foto, nome, bio e a chave de reviews privadas.
21. Editor do Top 5: busca de artista, reordenar e sugestões.
22. Seguir/deixar de seguir + listas de seguidores/seguindo.
23. Feed com scroll infinito, pull-to-refresh e estado vazio ("siga pessoas").
24. Curtidas (otimista) e tela de detalhe da review com comentários (visitante comenta; contador "X de 3 hoje"; mensagem ao atingir o limite com convite para criar conta).
24b. Denunciar review/comentário (menu "…" → motivo) e filtro simples de palavrões no envio.

**F6 Notificações**
25. Tela de notificações + badge com Realtime + marcar como lidas.
26. Push: registrar o token (`expo-notifications`), Edge Function `send-push` + Database Webhook, development build no EAS.

**F7 Qualidade e entrega**
27. Testes: Jest + RNTL (`StarRating`, `ReviewCard`, formulários), adaptadores com `fetch` mockado, e testes de RLS (scripts supabase-js com 2 usuários: privacidade, edição alheia, likes em review privada).
    **Feito com desvio:** em vez de Jest + RNTL, três suítes sem dependência pesada: `npm run test:db` (135 testes de RLS, triggers, feed, limites e rankings, rodando as migrations reais num Postgres em memória), `npm run test:functions` (15, lógica do push) e `npm run test:app` (50, formatação, validação, países, histórico e o provedor Deezer com cliente falso). **Não há teste automatizado de componentes visuais**; a interface foi validada à mão num Android.
28. Revisão de acessibilidade, estados vazios/erro e exclusão de conta. **Feito:** varredura de papéis e rótulos, alvos de toque ≥ 44 e contraste (todo texto ≥ 4,5:1); estado de erro no editor do Top 5 (sem ele, salvar uma lista que falhou ao carregar apagaria os favoritos); excluir conta, que agora fica em Configurações (engrenagem do perfil), junto com sair da conta.
29. Build do APK via EAS + roteiro de demo + reativação do Supabase. **Feito:** perfil `preview` (APK independente), `docs/roteiro-demo.md`. Reativar o Supabase é tarefa da semana da apresentação (consta no roteiro).

**Decisão:** a confirmação de e-mail fica desligada até a apresentação, para cadastrar contas de teste sem depender de e-mail. Reativar antes de qualquer publicação (README, "Antes de publicar").

## 5. Critérios de Aceite
- Cadastro/login por e-mail e Google; onboarding impede usar o app sem @; o @ é único.
- A busca encontra faixa, álbum, artista e usuário. Os detalhes mostram capa, álbum, data de lançamento e descrição (quando houver).
- Trending lista o top global e abre o detalhe.
- O usuário dá nota de 0,5 a 5 (meias estrelas) com texto opcional. Avaliar o mesmo item de novo **edita** a review existente. A média do item se atualiza.
- Perfil de terceiro mostra foto, nome, @, Top 5, contadores e reviews. Com `reviews_private` ligada, **nenhuma** review dele aparece no perfil, no feed, nos detalhes nem por consulta direta à API (verificado por teste de RLS).
- Seguir/deixar de seguir reflete no feed. O feed mostra só reviews de seguidos, em ordem cronológica e paginado, sem pular nem duplicar reviews com o mesmo `created_at` (teste com inserts no mesmo timestamp).
- Login Google funciona no APK Android com o app aberto e com o app fechado.
- Excluir a conta remove o avatar do Storage e todos os dados do usuário.
- Se o Deezer devolver o erro de cota, o app tenta de novo e mostra uma mensagem amigável, sem crash.
- Visitante navega e comenta; o 4º comentário em 24h é recusado **pelo banco** (teste de RLS/trigger). Visitante não consegue avaliar, curtir nem seguir, nem por chamada direta à API.
- Visitante que cria conta mantém os comentários anteriores.
- "Mais bem avaliados" ordena pela média bayesiana. Um item com uma única nota 5 não passa à frente de um com muitas notas 4,5. Visitantes não influenciam os rankings.
- Curtir e comentar funcionam. O autor recebe a notificação in-app em tempo real e push no Android (development build).
- Todos os testes de F7 passam. O app roda em Android (APK) e iOS (Expo Go) sem crash nos fluxos acima.
- Nenhum custo: apenas free tiers (Supabase, EAS, Deezer, Last.fm).
