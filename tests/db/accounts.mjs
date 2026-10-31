import { createDb, as, admin, asAnonRole, attempt, check, summary } from './harness.mjs';

export const db = await createDb();
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

// ---------- contas e visitantes ----------
const newUser = async (email, meta = {}, anonymous = false) =>
  (await one('insert into auth.users (email, raw_user_meta_data, is_anonymous) values ($1, $2, $3) returning id', [email, JSON.stringify(meta), anonymous])).id;

export const alice = await newUser('alice@x.com', { full_name: 'Alice A' });
export const bob = await newUser('bob@x.com');
export const carol = await newUser(null, {}, true);
export const dave = await newUser(null, {}, true);

const profiles = (await db.query('select id, display_name, username from public.profiles')).rows;
check('trigger criou um perfil por usuario', profiles.length === 4);
check('nome vem do full_name', profiles.find((p) => p.id === alice).display_name === 'Alice A');
check('nome vem do e-mail', profiles.find((p) => p.id === bob).display_name === 'bob');
check('visitante vira "Visitante ####" sem @', /^Visitante \d{4}$/.test(profiles.find((p) => p.id === carol).display_name) && profiles.find((p) => p.id === carol).username === null);

await as(db, alice);
check('define o proprio @', !(await attempt(db, "update public.profiles set username = 'alice' where id = $1", [alice])).error);
const other = await db.query("update public.profiles set username = 'hacked' where id = $1 returning id", [bob]);
check('nao edita perfil de outro (RLS)', other.rows.length === 0);
check('@ com maiuscula/espaco e recusado', (await attempt(db, "update public.profiles set username = 'Bad Name' where id = $1", [alice])).code === '23514');
check('@ curto demais e recusado', (await attempt(db, "update public.profiles set username = 'ab' where id = $1", [alice])).code === '23514');
await as(db, bob);
await db.query("update public.profiles set username = 'bob' where id = $1", [bob]);
await as(db, alice);
check('@ duplicado e recusado', (await attempt(db, "update public.profiles set username = 'bob' where id = $1", [alice])).code === '23505');

await asAnonRole(db);
check('sem login (role anon) nao le perfis', (await attempt(db, 'select * from public.profiles')).code === '42501');

// ---------- itens do catalogo ----------
const snap = (kind, ext, title, extra = {}) =>
  JSON.stringify({ kind, external_id: ext, title, artist_name: 'Artist X', artist_external_id: '10', album_title: 'Alb', cover_url: 'http://c/' + ext, release_date: '2001-01-01', ...extra });
export const ensure = async (sub, anonymous, kind, ext, title, extra) => {
  await as(db, sub, { anonymous });
  return attempt(db, 'select public.ensure_media_item($1::jsonb) as id', [snap(kind, ext, title, extra)]);
};

await as(db, alice);
const t1 = (await ensure(alice, false, 'track', '1', 'Song One')).rows[0].id;
const again = (await ensure(alice, false, 'track', '1', 'Song One')).rows[0].id;
check('ensure_media_item cria e devolve o mesmo id', !!t1 && t1 === again);
await ensure(alice, false, 'track', '1', 'Changed');
await admin(db);
check('dados novos nao sobrescrevem antes de 30 dias', (await one('select title from public.media_items where id = $1', [t1])).title === 'Song One');
await db.query("update public.media_items set updated_from_api_at = now() - interval '31 days' where id = $1", [t1]);
await ensure(alice, false, 'track', '1', 'Changed');
await admin(db);
check('apos 30 dias o snapshot e renovado', (await one('select title from public.media_items where id = $1', [t1])).title === 'Changed');
await db.query("update public.media_items set title = 'Song One' where id = $1", [t1]);
const guestEnsure = await ensure(carol, true, 'track', '99', 'Nope');
check('visitante nao registra item', guestEnsure.code === '42501');
export { t1 };
