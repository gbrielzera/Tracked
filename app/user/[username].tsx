import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { supabase } from '@/services/supabase/client';
import { colors, spacing, type } from '@/theme';

// Versão inicial do perfil público; Top 5, seguidores e reviews entram na F5.
export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data: row, error: queryError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, reviews_private')
        .eq('username', username)
        .maybeSingle();
      if (queryError) throw queryError;
      return row;
    },
  });

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Não foi possível carregar o perfil." onRetry={() => void refetch()} />;
  if (!data) return <EmptyState title="Perfil não encontrado" body={`Não existe ninguém com o @${username}.`} />;

  return (
    <Screen edges={['bottom']}>
      <View style={styles.header}>
        <Avatar uri={data.avatar_url} name={data.display_name} size={80} />
        <View style={styles.names}>
          <Text style={styles.name}>{data.display_name}</Text>
          <Text style={styles.handle}>@{data.username}</Text>
        </View>
      </View>
      {data.bio ? <Text style={styles.bio}>{data.bio}</Text> : null}
      {data.reviews_private ? <Text style={styles.note}>As reviews desta pessoa são privadas.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  names: { flex: 1, gap: 2 },
  name: { ...type.title, color: colors.paper },
  handle: { ...type.body, color: colors.fog },
  bio: { ...type.body, color: colors.paper },
  note: { ...type.small, color: colors.fog },
});
