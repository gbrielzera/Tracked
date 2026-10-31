import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { FavoriteStrip } from '@/components/FavoriteStrip';
import { ProfileStats } from '@/components/ProfileStats';
import { PullRefresh } from '@/components/PullRefresh';
import { ReviewCardView } from '@/components/ReviewCardView';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useProfile, useProfileStats, useToggleFollow, useUserReviews } from '@/features/social/queries';
import { countryName, flagOf } from '@/lib/countries';
import { useAuth, useAuthStatus } from '@/stores/auth';
import { colors, fonts, spacing, type } from '@/theme';
import { useFavoriteArtists } from './favorites';

function FollowButton({ targetId }: { targetId: string }) {
  const router = useRouter();
  const status = useAuthStatus();
  const stats = useProfileStats(targetId);
  const toggle = useToggleFollow(targetId);
  const following = !!stats.data?.isFollowing;

  const onPress = () => {
    if (status === 'guest') {
      router.push('/upgrade');
      return;
    }
    toggle.mutate(!following);
  };

  return (
    <Button
      label={following ? 'Seguindo' : 'Seguir'}
      variant={following ? 'secondary' : 'primary'}
      disabled={stats.isPending}
      onPress={onPress}
    />
  );
}

// Perfil de qualquer pessoa, inclusive o próprio (aba Perfil e tela /user/@).
export function ProfileView({ username }: { username: string }) {
  const router = useRouter();
  const myId = useAuth((s) => s.session?.user.id);

  const profileQuery = useProfile(username);
  const profile = profileQuery.data;
  const isOwn = !!profile && profile.id === myId;
  const hideReviews = !!profile?.reviewsPrivate && !isOwn;

  const stats = useProfileStats(profile?.id);
  const favorites = useFavoriteArtists(profile?.id);
  const reviews = useUserReviews(hideReviews ? undefined : profile?.id);

  if (profileQuery.isPending) return <LoadingState />;
  if (profileQuery.isError) {
    return (
      <ErrorState
        error={profileQuery.error}
        message="Não foi possível carregar o perfil."
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }
  if (!profile) {
    return <EmptyState title="Perfil não encontrado" body={`Não existe ninguém com o @${username}.`} />;
  }

  const items = reviews.data?.pages.flat() ?? [];
  const favoriteEntries = favorites.data ?? [];
  const refreshing = profileQuery.isRefetching || reviews.isRefetching;

  const refresh = () => {
    void profileQuery.refetch();
    void stats.refetch();
    void favorites.refetch();
    if (!hideReviews) void reviews.refetch();
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.identity}>
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size={80} />
        <View style={styles.names}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.handle}>@{profile.username}</Text>
          {countryName(profile.country) ? (
            <Text style={styles.country} accessibilityLabel={`País: ${countryName(profile.country)}`}>
              {flagOf(profile.country)} {countryName(profile.country)}
            </Text>
          ) : null}
        </View>
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {isOwn ? (
        <Button label="Editar perfil" variant="secondary" onPress={() => router.push('/settings/edit-profile')} />
      ) : (
        <FollowButton targetId={profile.id} />
      )}

      <ProfileStats
        stats={[
          { label: 'Reviews', value: hideReviews ? '–' : (stats.data?.reviews ?? 0) },
          {
            label: 'Seguidores',
            value: stats.data?.followers ?? 0,
            onPress: () => router.push(`/user/${profile.username}/followers`),
          },
          {
            label: 'Seguindo',
            value: stats.data?.following ?? 0,
            onPress: () => router.push(`/user/${profile.username}/following`),
          },
        ]}
      />

      {isOwn || favoriteEntries.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Top 5 artistas</Text>
          <FavoriteStrip
            entries={favoriteEntries}
            editable={isOwn}
            onEdit={() => router.push('/settings/favorites')}
          />
        </View>
      ) : null}

      {isOwn && profile.reviewsPrivate ? (
        <Text style={styles.note}>Suas reviews estão privadas: só você vê esta lista.</Text>
      ) : null}
      <Text style={styles.heading}>Reviews</Text>
    </View>
  );

  const empty = hideReviews ? (
    <Text style={styles.note}>As reviews desta pessoa são privadas.</Text>
  ) : reviews.isPending ? (
    <ActivityIndicator color={colors.mustard} style={styles.loading} />
  ) : reviews.isError ? (
    <Text style={styles.note}>Não foi possível carregar as reviews.</Text>
  ) : (
    <Text style={styles.note}>
      {isOwn ? 'Você ainda não avaliou nada. Pesquise uma música para começar.' : 'Nenhuma review ainda.'}
    </Text>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(review) => review.id}
      renderItem={({ item }) => <ReviewCardView review={item} showAuthor={false} showMedia />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      refreshControl={<PullRefresh refreshing={refreshing} onRefresh={refresh} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (reviews.hasNextPage && !reviews.isFetchingNextPage) void reviews.fetchNextPage();
      }}
      ListFooterComponent={
        reviews.isFetchingNextPage ? <ActivityIndicator color={colors.mustard} style={styles.loading} /> : <View />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  names: { flex: 1, gap: 2 },
  name: { ...type.title, color: colors.paper },
  handle: { ...type.body, color: colors.fog },
  country: { ...type.body, color: colors.paper },
  bio: { ...type.body, color: colors.paper },
  section: { gap: spacing.sm },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.paper, letterSpacing: -0.3 },
  note: { ...type.body, color: colors.fog },
  loading: { paddingVertical: spacing.lg },
});
