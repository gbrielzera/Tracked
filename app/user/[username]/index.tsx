import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '@/features/profile/ProfileView';

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  return <ProfileView username={username} />;
}
