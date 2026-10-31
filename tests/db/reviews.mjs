import { db, alice, bob, carol, dave, t1, ensure } from './accounts.mjs';
import { as, admin, attempt, check } from './harness.mjs';

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const count = async (sql, params) => Number((await one(sql, params)).n);

// ---------- avaliacoes ----------
const review = (user, item, rating, body = null) =>
  attempt(db, 'insert into public.reviews (user_id, media_item_id, rating, body) values ($1, $2, $3, $4) returning id', [user, item, rating, body]);

await as(db, alice);
const aliceReview = (await review(alice, t1, 4.5, 'great')).rows[0].id;
await as(db, bob);
const bobReview = (await review(bob, t1, 3)).rows[0].id;
await admin(db);
let item = await one('select avg_rating, ratings_count from public.media_items where id = $1', [t1]);
check('media do item apos 2 reviews', Number(item.avg_rating) === 3.75 && item.ratings_count === 2, JSON.stringify(item));

await as(db, carol, { anonymous: true });
check('visitante nao avalia (RLS)', (await review(carol, t1, 5)).code === '42501');
await as(db, alice);
check('nota fora de meia estrela e recusada', (await review(alice, (await ensure(alice, false, 'track', '2', 'Two')).rows[0].id, 4.7)).code === '23514');
check('nota zero e recusada', (await review(alice, t1, 0)).code === '23514');
check('segunda review do mesmo item e recusada', (await review(alice, t1, 3)).code === '23505');
await db.query('update public.reviews set rating = 5 where id = $1', [aliceReview]);
await admin(db);
item = await one('select avg_rating, ratings_count from public.media_items where id = $1', [t1]);
check('media recalcula ao editar', Number(item.avg_rating) === 4 && item.ratings_count === 2, JSON.stringify(item));
await as(db, bob);
const steal = await db.query("update public.reviews set rating = 1 where id = $1 returning id", [aliceReview]);
check('nao edita review de outra pessoa', steal.rows.length === 0);
await as(db, alice);
check('nao troca o item de uma review', (await attempt(db, 'update public.reviews set media_item_id = $1 where id = $2', [(await one('select id from public.media_items where external_id = $1', ['2'])).id, aliceReview])).code !== undefined);

// ---------- privacidade (reviews_private) ----------
await as(db, bob);
await db.query('update public.profiles set reviews_private = true where id = $1', [bob]);
await as(db, alice);
check('review privada some para os outros', (await count('select count(*) n from public.reviews where id = $1', [bobReview])) === 0);
check('list_reviews tambem esconde', (await db.query('select * from public.list_reviews(p_media_item_id => $1)', [t1])).rows.length === 1);
check('get_review esconde', (await db.query('select * from public.get_review($1)', [bobReview])).rows.length === 0);
check('stats mostram 0 reviews de perfil privado', Number((await one('select reviews n from public.get_profile_stats($1)', [bob])).n) === 0);
await as(db, bob);
check('o dono ve a propria review privada', (await db.query('select * from public.get_review($1)', [bobReview])).rows.length === 1);
await as(db, carol, { anonymous: true });
check('visitante nao ve review privada', (await count('select count(*) n from public.reviews where id = $1', [bobReview])) === 0);
await as(db, alice);
check('nao curte review privada', (await attempt(db, 'insert into public.review_likes (user_id, review_id) values ($1, $2)', [alice, bobReview])).code === '42501');
check('nao comenta review privada', (await attempt(db, "insert into public.review_comments (review_id, user_id, body) values ($1, $2, 'oi')", [bobReview, alice])).code === '42501');
await as(db, bob);
await db.query('update public.profiles set reviews_private = false where id = $1', [bob]);

export { aliceReview, bobReview };
