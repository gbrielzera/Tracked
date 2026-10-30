import { Redirect } from 'expo-router';
import { useAuthStatus } from '@/stores/auth';

// Rota raiz, fora dos grupos protegidos: sempre existe e encaminha conforme o login.
// Sem ela, quando a guarda desliga (auth) o app cai em "Unmatched Route" em tracked:///.
export default function Index() {
  const status = useAuthStatus();

  switch (status) {
    case 'loading':
      return null;
    case 'signedOut':
      return <Redirect href="/welcome" />;
    case 'needsOnboarding':
      return <Redirect href="/onboarding" />;
    default:
      return <Redirect href="/feed" />;
  }
}
