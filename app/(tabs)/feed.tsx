import { GuestGate } from '@/components/GuestGate';
import { Placeholder } from '@/components/Placeholder';
import { useAuthStatus } from '@/stores/auth';

export default function FeedScreen() {
  const status = useAuthStatus();
  if (status === 'guest') {
    return (
      <GuestGate
        title="Veja o que as pessoas estão ouvindo"
        body="Crie uma conta para seguir pessoas e ler as reviews delas aqui."
      />
    );
  }
  return <Placeholder title="Feed" />;
}
