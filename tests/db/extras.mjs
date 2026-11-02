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

// ---------- 5 musicas do momento ----------
const track = async (ext, title, rating) => {
  const id = (await ensure(alice, false, 'track', ext, title, { artist_name: 'Artist X', artist_external_id: '10' })).rows[0].id;
  if (rating) {
    await as(db, alice);
    await db.query('insert into public.reviews (user_id, media_item_id, rating) values ($1, $2, $3)', [alice, id, rating]);
  }
  return id;
};
const [tr1, tr2, tr3, tr4, tr5, tr6] = [
  await track('201', 'Faixa A', 4.5), await track('202', 'Faixa B', 5), await track('203', 'Faixa C'),
  await track('204', 'Faixa D'), await track('205', 'Faixa E'), await track('206', 'Faixa F'),
];
await as(db, alice);
const setTracks = (ids) => attempt(db, 'select public.set_favorite_tracks($1::uuid[])', [ids]);
const favTracks = async () => (await db.query('select position, media_item_id from public.favorite_tracks where user_id = $1 order by position', [alice])).rows;

check('salva as musicas do momento na ordem', !(await setTracks([tr2, tr1, tr3])).error);
rows = await favTracks();
check('musicas: posicoes 1..3 seguem a ordem', rows.length === 3 && rows[0].media_item_id === tr2 && rows[1].media_item_id === tr1 && rows[2].media_item_id === tr3);
check('musicas: reordenar e remover troca tudo', !(await setTracks([tr3, tr1])).error && (await favTracks()).length === 2);
check('6 musicas e recusado', (await setTracks([tr1, tr2, tr3, tr4, tr5, tr6])).code === '22023');
check('5 musicas e aceito', !(await setTracks([tr1, tr2, tr3, tr4, tr5])).error);
check('artista nao entra nas musicas do momento', (await setTracks([ar1])).message?.includes('apenas itens do tipo track'));
check('musica nao entra no Top 5 de artistas', (await set([tr1])).message?.includes('apenas itens do tipo artist'));
check('falha nao apaga as musicas anteriores (transacao)', (await favTracks()).length === 5);
check('musica repetida e recusada', (await setTracks([tr1, tr1])).code === '23505');
check('as duas listas sao independentes', (await favs()).length === 5 && (await favTracks()).length === 5);
const trackSug = (await db.query('select track_external_id, rating from public.suggest_favorite_tracks(10)')).rows;
check('sugestoes de musicas vem das reviews, melhor nota primeiro', trackSug.length >= 2 && Number(trackSug[0].rating) >= Number(trackSug[1].rating), JSON.stringify(trackSug.slice(0, 2)));
check('sugestoes so tem musicas (nao artistas)', trackSug.every((row) => !['10', '11', '12'].includes(row.track_external_id)));
// As avaliacoes acima so serviram para as sugestoes: tira, senao entram nas contas dos rankings abaixo.
await admin(db);
await db.query('delete from public.reviews where media_item_id = any($1::uuid[])', [[tr1, tr2]]);
await as(db, alice);
await as(db, carol, { anonymous: true });
check('visitante nao define musicas do momento', (await setTracks([tr1])).code === '42501');
await as(db, bob);
check('qualquer um le as musicas de alice', (await count('select count(*) n from public.favorite_tracks where user_id = $1', [alice])) === 5);
check('outra pessoa nao altera as musicas de alice (RLS)', (await db.query('update public.favorite_tracks set position = 1 where user_id = $1 returning 1', [alice])).rows.length === 0);
await asAnonRole(db);
check('sem login nao le musicas do momento', (await attempt(db, 'select * from public.favorite_tracks')).code === '42501');
await as(db, alice);

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
