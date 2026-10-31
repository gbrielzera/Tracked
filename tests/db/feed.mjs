import { db, alice, bob, carol, dave, t1, ensure } from './accounts.mjs';
import { aliceReview, bobReview } from './reviews.mjs';
import { count, one, notifs } from './interactions.mjs';
import { as, admin, asAnonRole, attempt, check } from './harness.mjs';

// ---------- seguir ----------
await as(db, alice);
check('segue outra pessoa', !(await attempt(db, 'insert into public.follows (follower_id, following_id) values ($1, $2)', [alice, bob])).error);
check('nao segue a si mesma', (await attempt(db, 'insert into public.follows (follower_id, following_id) values ($1, $1)', [alice])).code === '23514');
check('nao segue em nome de outro', (await attempt(db, 'insert into public.follows (follower_id, following_id) values ($1, $2)', [bob, alice])).code === '42501');
await as(db, carol, { anonymous: true });
check('visitante nao segue', (await attempt(db, 'insert into public.follows (follower_id, following_id) values ($1, $2)', [carol, bob])).code === '42501');
await admin(db);
check('seguido recebe notificacao de follow', (await notifs(bob, 'follow')) === 1);

// ---------- feed: 5 reviews do bob com o MESMO created_at, paginadas de 2 em 2 ----------
const sameTime = '2025-01-01T00:00:00Z';
const ids = [];
for (let n = 2; n <= 6; n++) {
  const item = (await ensure(alice, false, 'track', String(n), 'Song ' + n)).rows[0].id;
  await admin(db);
  const r = await db.query('insert into public.reviews (user_id, media_item_id, rating, created_at) values ($1, $2, 2, $3) returning id', [bob, item, sameTime]);
  ids.push(r.rows[0].id);
}
await as(db, alice);
const seen = [];
let cursor = [null, null];
for (let page = 0; page < 6; page++) {
  const rows = (await db.query('select id, created_at from public.get_feed($1, $2, 2)', cursor)).rows;
  if (rows.length === 0) break;
  seen.push(...rows.map((r) => r.id));
  const last = rows[rows.length - 1];
  cursor = [last.created_at.toISOString(), last.id];
}
check('feed traz so reviews de quem sigo (6 do bob)', seen.length === 6, 'itens=' + seen.length);
check('paginacao sem repetir nem pular com created_at igual', new Set(seen).size === 6 && ids.every((id) => seen.includes(id)) && seen.includes(bobReview));
check('review mais nova vem primeiro', seen[0] === bobReview);
const sorted = [...ids].sort().reverse();
check('empate desempatado por id desc', JSON.stringify(seen.slice(1)) === JSON.stringify(sorted));
const mine = (await db.query('select id from public.get_feed(null, null, 50)')).rows.map((r) => r.id);
check('feed nao inclui as proprias reviews', !mine.includes(aliceReview));
await as(db, bob);
await db.query('update public.profiles set reviews_private = true where id = $1', [bob]);
await as(db, alice);
check('perfil privado some do feed de quem o segue', (await db.query('select * from public.get_feed(null, null, 50)')).rows.length === 0);
await as(db, bob);
await db.query('update public.profiles set reviews_private = false where id = $1', [bob]);
await as(db, carol, { anonymous: true });
check('visitante tem feed vazio', (await db.query('select * from public.get_feed(null, null, 50)')).rows.length === 0);

// ---------- contadores ----------
await as(db, alice);
const stats = await one('select * from public.get_profile_stats($1)', [bob]);
check('get_profile_stats do bob', Number(stats.followers) === 1 && Number(stats.following) === 0 && Number(stats.reviews) === 6 && stats.is_following === true, JSON.stringify(stats));
await db.query('delete from public.follows where follower_id = $1 and following_id = $2', [alice, bob]);
await admin(db);
check('deixar de seguir remove a notificacao', (await notifs(bob, 'follow')) === 0);
await as(db, alice);
check('is_following volta a falso', (await one('select is_following from public.get_profile_stats($1)', [bob])).is_following === false);
await db.query('insert into public.follows (follower_id, following_id) values ($1, $2)', [alice, bob]);

export {};
