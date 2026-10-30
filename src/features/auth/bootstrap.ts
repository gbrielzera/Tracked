import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/stores/auth';

async function loadProfile(userId: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) return data;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return null;
}

async function syncSession(session: Session | null) {
  const { set } = useAuth.getState();
  if (!session) {
    set({ session: null, profile: null, initialized: true });
    return;
  }
  const profile = await loadProfile(session.user.id);
  set({ session, profile, initialized: true });
}

export async function refreshProfile() {
  const { session, set } = useAuth.getState();
  if (!session) return;
  set({ profile: await loadProfile(session.user.id) });
}

// Único listener de auth do app. O evento INITIAL_SESSION cobre a leitura da sessão salva.
export function useAuthBootstrap() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        useAuth.getState().set({ session });
        return;
      }
      // Não chame o Supabase dentro do callback (trava o cliente): adie para o próximo tick.
      setTimeout(() => void syncSession(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
}
