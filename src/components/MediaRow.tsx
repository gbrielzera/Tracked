import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MediaCover } from '@/components/MediaCover';
import { colors, fonts, type } from '@/theme';

type Props = {
  title: string;
  subtitle?: string | null;
  coverUri?: string | null;
  round?: boolean;
  // Conteúdo antes da capa (posição no ranking, número da faixa).
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  coverSize?: number;
};

export function MediaRow({ title, subtitle, coverUri, round, leading, trailing, onPress, coverSize = 56 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      {coverUri !== undefined || round ? <MediaCover uri={coverUri} size={coverSize} round={round} /> : null}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

// Número de posição (ranking) ou de faixa: aqui a numeração faz sentido, é uma sequência.
export function RankNumber({ value }: { value: number }) {
  return <Text style={styles.rank}>{value}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
  pressed: { backgroundColor: colors.sleeve },
  leading: { minWidth: 28, alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { ...type.body, fontFamily: fonts.semibold, color: colors.paper },
  subtitle: { ...type.small, color: colors.fog },
  trailing: { alignItems: 'flex-end' },
  rank: { fontFamily: fonts.extra, fontSize: 20, color: colors.fog },
});
