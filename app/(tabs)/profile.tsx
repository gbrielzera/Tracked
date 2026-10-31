import { GuestGate } from '@/components/GuestGate';
import { LoadingState } from '@/components/states';
import { ProfileView } from '@/features/profile/ProfileView';
import { useAuth, useAuthStatus } from '@/stores/auth';

export default function ProfileScreen() {
  const status = useAuthStatus();
  const username = useAuth((s) => s.profile?.username);

  if (status === 'guest') {
    return (
      <GuestGate
        title="Seu perfil fica aqui"
        body="Crie uma conta para ter perfil, avaliar músicas e escolher seus 5 artistas favoritos."
      />
    );
  }
  if (!username) return <LoadingState />;
  return <ProfileView username={username} />;
}
