import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase/client';
import { exchangeCodeOnce } from './exchange';
import { authErrorMessage } from './errors';

WebBrowser.maybeCompleteAuthSession();

type Result = { ok: true } | { ok: false; cancelled?: boolean; message?: string };

// link = true vincula o Google à conta do visitante atual (mesmo uid, mantém os comentários).
export async function signInWithGoogle(link = false): Promise<Result> {
  // tracked://auth/callback em build próprio; exp://.../--/auth/callback no Expo Go.
  const redirectTo = Linking.createURL('auth/callback');
  const options = { redirectTo, skipBrowserRedirect: true };

  const { data, error } = link
    ? await supabase.auth.linkIdentity({ provider: 'google', options })
    : await supabase.auth.signInWithOAuth({ provider: 'google', options });
  if (error || !data.url) return { ok: false, message: authErrorMessage(error) };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { ok: false, cancelled: true };

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  if (typeof code !== 'string') {
    return { ok: false, message: 'Não foi possível concluir o login com o Google.' };
  }
  const { error: exchangeError } = await exchangeCodeOnce(code);
  if (exchangeError) return { ok: false, message: authErrorMessage(exchangeError) };
  return { ok: true };
}
