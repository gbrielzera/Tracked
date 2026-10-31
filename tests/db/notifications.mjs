import { db, alice, bob, carol } from './accounts.mjs';
import { count, one } from './interactions.mjs';
import './extras.mjs';
import { as, asAnonRole, attempt, check } from './harness.mjs';

// ---------- notificações ----------
await as(db, bob);
const mine = (await db.query('select id, type, read_at from public.notifications order by created_at')).rows;
check('destinatário vê as próprias notificações', mine.length >= 2, 'total=' + mine.length);
check('todas começam não lidas', mine.every((n) => n.read_at === null));

await as(db, alice);
check('outra pessoa não vê notificações alheias', (await count('select count(*) n from public.notifications where recipient_id = $1', [bob])) === 0);
const steal = await db.query('update public.notifications set read_at = now() where recipient_id = $1 returning id', [bob]);
check('não marca como lida a notificação de outro', steal.rows.length === 0);
check('ninguém cria notificação à mão (só gatilhos)', (await attempt(db,
  "insert into public.notifications (recipient_id, actor_id, type) values ($1, $2, 'follow')", [alice, bob])).code === '42501');

await as(db, bob);
const read = await db.query('update public.notifications set read_at = now() where id = $1 returning read_at', [mine[0].id]);
check('marca como lida', read.rows.length === 1 && read.rows[0].read_at !== null);
check('só a coluna read_at pode mudar', (await attempt(db,
  "update public.notifications set type = 'like' where id = $1", [mine[1].id])).code === '42501');
check('não troca o destinatário', (await attempt(db,
  'update public.notifications set recipient_id = $1 where id = $2', [alice, mine[1].id])).code === '42501');
const unread = await count('select count(*) n from public.notifications where recipient_id = $1 and read_at is null', [bob]);
check('contador de não lidas diminui', unread === mine.length - 1, 'não lidas=' + unread);
const markAll = await db.query('update public.notifications set read_at = now() where recipient_id = $1 and read_at is null returning id', [bob]);
check('marcar todas como lidas', markAll.rows.length === mine.length - 1);
const removed = await db.query('delete from public.notifications where id = $1 returning id', [mine[0].id]);
check('apaga a própria notificação', removed.rows.length === 1);

// ---------- token de push ----------
const token = 'ExponentPushToken[abc123]';
await as(db, alice);
check('conta registra o token', !(await attempt(db, 'select public.register_push_token($1, $2)', [token, 'android'])).error);
await as(db, bob);
check('mesmo aparelho, outra conta: o token troca de dono', !(await attempt(db, 'select public.register_push_token($1, $2)', [token, 'android'])).error);
check('o token tem um dono só', (await count('select count(*) n from public.push_tokens where token = $1', [token])) === 1);
check('dono vê o próprio token', (await count('select count(*) n from public.push_tokens')) === 1);
await as(db, alice);
check('quem perdeu o token não o vê mais', (await count('select count(*) n from public.push_tokens')) === 0);
check('plataforma inválida é recusada', (await attempt(db, 'select public.register_push_token($1, $2)', ['ExponentPushToken[x]', 'web'])).code === '23514');
await as(db, carol, { anonymous: true });
check('visitante não registra push', (await attempt(db, 'select public.register_push_token($1, $2)', ['ExponentPushToken[g]', 'android'])).code === '42501');
await asAnonRole(db);
check('sem login não registra push', (await attempt(db, 'select public.register_push_token($1, $2)', ['ExponentPushToken[z]', 'android'])).code === '42501');
await as(db, bob);
const gone = await db.query('delete from public.push_tokens where token = $1 returning token', [token]);
check('apaga o próprio token (sair da conta)', gone.rows.length === 1);
