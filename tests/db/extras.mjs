import { db, alice, bob, carol, t1, ensure } from './accounts.mjs';
import { aliceReview } from './reviews.mjs';
import { count, one } from './interactions.mjs';
import './feed.mjs';
import { as, admin, asAnonRole, attempt, check } from './harness.mjs';

// ---------- Top 5 ----------
const artist = async (ext, name) =>
  (await ensure(alice, false, 'artist', ext, name, { artist_name: name, artist_external_id: ext })).rows[0].id;
const [ar1, ar2, ar3, ar4, ar5, ar6] = [
  await artist('10', 'Artist X'), await artist('11', 'Artist Y'), await artist('12', 'Artist Z'),
  await artist('13', 'Artist W'), await artist('14', 'Artist V'), await artist('15', 'Artist U'),
];
await as(db, alice);
const set = (ids) => attempt(db, 'select public.set_favorite_artists($1::uuid[])', [ids]);
const favs = async () => (await db.query('select position, media_item_id from public.favorite_artists where user_id = $1 order by position', [alice])).rows;

check('salva o Top 5 na ordem', !(await set([ar2, ar1, ar3])).error);
let rows = await favs();
check('posicoes 1..3 seguem a ordem do array', rows.length === 3 && rows[0].media_item_id === ar2 && rows[1].media_item_id === ar1 && rows[2].media_item_id === ar3);
check('reordenar e remover troca tudo de uma vez', !(await set([ar3, ar1])).error);
rows = await favs();
check('agora so 2, com o ar3 em primeiro', rows.length === 2 && rows[0].media_item_id === ar3 && rows[0].position === 1);
check('6 artistas e recusado', (await set([ar1, ar2, ar3, ar4, ar5, ar6])).code === '22023');
check('lista com 5 e aceita', !(await set([ar1, ar2, ar3, ar4, ar5])).error);
check('item que nao e artista e recusado', (await set([t1])).message?.includes('apenas itens do tipo artist'));
rows = await favs();
check('falha nao apaga o Top 5 anterior (transacao)', rows.length === 5);
check('artista repetido e recusado', (await set([ar1, ar1])).code === '23505');
await as(db, carol, { anonymous: true });
check('visitante nao define Top 5', (await set([ar1])).code === '42501');
await as(db, bob);
check('qualquer um le o Top 5 de alice', (await count('select count(*) n from public.favorite_artists where user_id = $1', [alice])) === 5);
await as(db, alice);
const sug = (await db.query('select artist_external_id, avg_rating, reviews_count from public.suggest_favorite_artists(10)')).rows;
check('sugestoes agrupam por artista das reviews', sug.length >= 1 && sug[0].artist_external_id === '10', JSON.stringify(sug[0]));

// ---------- rankings (media bayesiana) ----------
await admin(db);
await db.query('select public.refresh_rankings()');
await as(db, alice);
const tracks = (await db.query("select * from public.get_rankings('track')")).rows;
check('so entra item com 2+ avaliacoes', tracks.length === 1 && tracks[0].external_id === '1' && tracks[0].votes === 2, JSON.stringify(tracks.map((r) => [r.external_id, r.votes])));
const expected = (2 / 5) * 4 + (3 / 5) * ((5 + 3 + 5 * 2) / 7);
check('score = media bayesiana', Math.abs(Number(tracks[0].score) - expected) < 0.0002, `score=${tracks[0].score} esperado=${expected.toFixed(4)}`);
check('nota media do item', Number(tracks[0].avg_rating) === 4);
const disco = (await db.query("select * from public.get_rankings('discography')")).rows;
check('discografia agrupa faixas por artista', disco.length === 1 && disco[0].key === 'artist:10' && disco[0].votes === 7, JSON.stringify(disco.map((r) => [r.key, r.votes])));
await as(db, carol, { anonymous: true });
check('visitante le o ranking', (await db.query("select * from public.get_rankings('track')")).rows.length === 1);
await asAnonRole(db);
check('sem login nao executa get_rankings', (await attempt(db, "select * from public.get_rankings('track')")).code === '42501');
await as(db, alice);
check('usuario comum nao atualiza o ranking', (await attempt(db, 'select public.refresh_rankings()')).code === '42501');
check('usuario comum nao le a view direto', (await attempt(db, 'select * from public.rankings')).code === '42501');

// ---------- denuncias ----------
const report = (user, review, comment, reason = 'spam') =>
  attempt(db, 'insert into public.reports (reporter_id, review_id, comment_id, reason) values ($1, $2, $3, $4)', [user, review, comment, reason]);
await as(db, carol, { anonymous: true });
check('visitante pode denunciar', !(await report(carol, aliceReview, null)).error);
check('denuncia sem alvo e recusada', (await report(carol, null, null)).code === '23514');
check('denuncia com 2 alvos e recusada', (await report(carol, aliceReview, '00000000-0000-0000-0000-000000000000')).code !== undefined);
check('nao denuncia em nome de outro', (await report(alice, aliceReview, null)).code === '42501');
check('denunciante ve so as proprias', (await count('select count(*) n from public.reports')) === 1);
await as(db, alice);
check('outros nao veem denuncias alheias', (await count('select count(*) n from public.reports')) === 0);

// ---------- busca de pessoas ----------
const found = (await db.query("select username from public.search_users('ali')")).rows;
check('search_users acha por @', found.length === 1 && found[0].username === 'alice');
check('termo curto nao busca', (await db.query("select * from public.search_users('a')")).rows.length === 0);
check('visitantes (sem @) ficam de fora', (await db.query("select * from public.search_users('visitante')")).rows.length === 0);
check('curingas % e _ sao tratados como texto', (await db.query("select * from public.search_users('%%')")).rows.length === 0);
