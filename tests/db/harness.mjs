import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIG = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));
const FILES = [
  '20261030120000_schema.sql',
  '20261030120100_helpers_triggers.sql',
  '20261030120200_rls.sql',
  '20261030120300_rpcs_rankings.sql',
  '20261031120000_social_rpcs.sql',
  '20261031140000_profile_country.sql',
  '20261102120000_favorite_tracks.sql',
];

// Testa as migrations de supabase/migrations num Postgres local em memória (PGlite),
// sem Docker nem conta no Supabase. A migration de storage/cron fica de fora (usa recursos só do Supabase).

// Imita o que o Supabase fornece: roles, schema auth, auth.uid()/auth.jwt() e privilegios padrao.
const SUPABASE_STUBS = `
  create schema extensions;
  create schema auth;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    is_anonymous boolean not null default false,
    last_sign_in_at timestamptz,
    created_at timestamptz not null default now()
  );
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export async function createDb() {
  const db = new PGlite({ extensions: { citext, pg_trgm } });
  await db.exec(SUPABASE_STUBS);
  for (const file of FILES) await db.exec(readFileSync(`${MIG}/${file}`, 'utf8'));
  return db;
}

// Executa como um usuario (role authenticated + claims do JWT) ou como admin (superuser).
export async function as(db, sub, { anonymous = false } = {}) {
  await db.exec('reset role');
  const claims = JSON.stringify({ sub, role: 'authenticated', is_anonymous: anonymous });
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec('set role authenticated');
}
export const admin = (db) => db.exec('reset role');
export async function asAnonRole(db) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', '', false)");
  await db.exec('set role anon');
}

let passed = 0;
let failed = 0;
export function check(name, condition, extra = '') {
  console.log((condition ? 'OK   ' : 'FAIL ') + name + (extra ? ' - ' + extra : ''));
  condition ? passed++ : failed++;
}
export const summary = () => {
  console.log(failed === 0 ? `TODOS OS ${passed} TESTES PASSARAM` : `${failed} FALHA(S), ${passed} ok`);
  return failed === 0 ? 0 : 1;
};

// Roda a query e devolve { rows } ou { error } (para testar o que DEVE falhar).
export async function attempt(db, sql, params = []) {
  try {
    return { rows: (await db.query(sql, params)).rows };
  } catch (error) {
    return { error, code: error.code, message: error.message };
  }
}
