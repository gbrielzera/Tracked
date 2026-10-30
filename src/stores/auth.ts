import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Tables } from '@/services/supabase/database.types';

export type Profile = Tables<'profiles'>;

type AuthState = {
  initialized: boolean;
  session: Session | null;
  profile: Profile | null;
  set: (patch: Partial<Pick<AuthState, 'initialized' | 'session' | 'profile'>>) => void;
};

export const useAuth = create<AuthState>((set) => ({
  initialized: false,
  session: null,
  profile: null,
  set: (patch) => set(patch),
}));

// loading: lendo a sessão salva | signedOut: sem sessão | guest: login anônimo
// needsOnboarding: conta sem @ | ready: conta completa
export type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'needsOnboarding' | 'ready';

export function selectStatus(s: AuthState): AuthStatus {
  if (!s.initialized) return 'loading';
  if (!s.session) return 'signedOut';
  if (s.session.user.is_anonymous) return 'guest';
  if (!s.profile?.username) return 'needsOnboarding';
  return 'ready';
}

export const useAuthStatus = () => useAuth(selectStatus);
