import { supabase } from '@/services/supabase/client';

// O mesmo código pode chegar por dois caminhos (retorno do navegador e deep link).
// Trocar duas vezes falharia, então compartilhamos a mesma chamada.
const inflight = new Map<string, ReturnType<typeof run>>();

async function run(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error };
}

export function exchangeCodeOnce(code: string) {
  let promise = inflight.get(code);
  if (!promise) {
    promise = run(code);
    inflight.set(code, promise);
  }
  return promise;
}
