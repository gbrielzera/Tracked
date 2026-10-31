import { db, alice, bob, carol, dave, t1 } from './accounts.mjs';
import { aliceReview, bobReview } from './reviews.mjs';
import { as, admin, attempt, check } from './harness.mjs';

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const count = async (sql, params) => Number((await one(sql, params)).n);
const notifs = (recipient, type) =>
  count('select count(*) n from public.notifications where recipient_id = $1 and type = $2', [recipient, type]);

// ---------- curtidas e notificacoes ----------
await as(db, alice);
check('curte review de outra pessoa', !(await attempt(db, 'insert into public.review_likes (user_id, review_id) values ($1, $2)', [alice, bobReview])).error);
await admin(db);
check('dono da review recebe notificacao de curtida', (await notifs(bob, 'like')) === 1);
await as(db, alice);
check('curtir duas vezes e recusado', (await attempt(db, 'insert into public.review_likes (user_id, review_id) values ($1, $2)', [alice, bobReview])).code === '23505');
await db.query('insert into public.review_likes (user_id, review_id) values ($1, $2)', [alice, aliceReview]);
await admin(db);
check('curtir a propria review nao notifica', (await notifs(alice, 'like')) === 0);
await as(db, carol, { anonymous: true });
check('visitante nao curte', (await attempt(db, 'insert into public.review_likes (user_id, review_id) values ($1, $2)', [carol, bobReview])).code === '42501');
await as(db, alice);
await db.query('delete from public.review_likes where user_id = $1 and review_id = $2', [alice, bobReview]);
await admin(db);
check('descurtir remove a notificacao', (await notifs(bob, 'like')) === 0);

// ---------- comentarios e limite do visitante ----------
const comment = (user, review, body = 'oi') =>
  attempt(db, 'insert into public.review_comments (review_id, user_id, body) values ($1, $2, $3) returning id', [review, user, body]);
await as(db, carol, { anonymous: true });
const guestComments = [];
for (let i = 1; i <= 3; i++) guestComments.push(await comment(carol, aliceReview, 'comentario ' + i));
check('visitante comenta 3 vezes', guestComments.every((c) => !c.error));
const fourth = await comment(carol, aliceReview, 'quarto');
check('4o comentario do visitante e barrado pelo banco', fourth.message === 'comment_limit' && fourth.code === 'P0001', fourth.message);
const quota = await one('select used, max_allowed from public.comment_quota()');
check('comment_quota do visitante = 3 de 3', quota.used === 3 && quota.max_allowed === 3, JSON.stringify(quota));
await as(db, dave, { anonymous: true });
check('comentario vazio e recusado', (await comment(dave, aliceReview, '   ')).code === '23514');
check('limite e por pessoa (outro visitante comenta)', !(await comment(dave, aliceReview, 'oi dave')).error);
await as(db, alice);
check('conta tem limite maior (100)', (await one('select max_allowed from public.comment_quota()')).max_allowed === 100);
check('conta comenta normalmente', !(await comment(alice, bobReview, 'bom!')).error);
await admin(db);
check('dono da review recebe notificacao de comentario', (await notifs(alice, 'comment')) === 4);
await as(db, alice);
const del = await db.query('delete from public.review_comments where id = $1 returning id', [guestComments[0].rows[0].id]);
check('dono da review apaga comentario de terceiro', del.rows.length === 1);
await as(db, bob);
const delOther = await db.query('delete from public.review_comments where id = $1 returning id', [guestComments[1].rows[0].id]);
check('terceiro nao apaga comentario alheio', delOther.rows.length === 0);
await as(db, dave, { anonymous: true });
check('visitante le comentarios', (await count('select count(*) n from public.review_comments where review_id = $1', [aliceReview])) >= 3);
await admin(db);
await db.query("update public.review_comments set created_at = now() - interval '25 hours' where user_id = $1", [carol]);
await as(db, carol, { anonymous: true });
check('limite renova depois de 24h', !(await comment(carol, aliceReview, 'de novo')).error);

export { count, one, notifs };
