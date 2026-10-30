// Exclui a conta de quem chama: remove o avatar do Storage e depois o usuario.
// O cascade do Postgres apaga profile, reviews, likes, comentarios etc.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Identifica o chamador pelo JWT dele; nunca confia em um id vindo no corpo.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);
  const uid = data.user.id;

  const admin = createClient(url, serviceKey);

  const { data: files, error: listError } = await admin.storage.from('avatars').list(uid);
  if (listError) return json({ error: 'storage_list_failed' }, 500);
  if (files && files.length > 0) {
    const { error: removeError } = await admin.storage
      .from('avatars')
      .remove(files.map((f) => `${uid}/${f.name}`));
    if (removeError) return json({ error: 'storage_remove_failed' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) return json({ error: 'delete_failed' }, 500);

  return json({ ok: true });
});
