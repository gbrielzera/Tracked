import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaCover } from '@/components/MediaCover';
import { colors, fonts, spacing, type } from '@/theme';

export function DetailLayout({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

type HeroProps = { coverUri?: string | null; round?: boolean; title: string; children?: React.ReactNode };

export function DetailHero({ coverUri, round, title, children }: HeroProps) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - spacing.lg * 2, 320);
  return (
    <View style={styles.hero}>
      <MediaCover uri={coverUri} size={size} round={round} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.heading} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function LinkText({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={6}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

// Lista de fatos (rótulo + valor): a estrutura em duas colunas já diz o que cada linha é.
export function Facts({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  const visible = items.filter((item): item is { label: string; value: string } => !!item.value);
  if (visible.length === 0) return null;
  return (
    <View style={styles.facts}>
      {visible.map((item) => (
        <View key={item.label} style={styles.factRow}>
          <Text style={styles.factLabel}>{item.label}</Text>
          <Text style={styles.factValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function Attribution({ children }: { children: React.ReactNode }) {
  return <Text style={styles.attribution}>{children}</Text>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl },
  hero: { gap: spacing.sm },
  title: { ...type.title, color: colors.paper, marginTop: spacing.sm },
  heading: { ...type.title, fontSize: 22, lineHeight: 28, color: colors.paper },
  link: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.teal },
  facts: { gap: 6, marginTop: spacing.sm },
  factRow: { flexDirection: 'row', gap: spacing.md },
  factLabel: { ...type.small, color: colors.fog, width: 96 },
  factValue: { ...type.small, color: colors.paper, flex: 1 },
  attribution: { ...type.small, color: colors.fog, textAlign: 'center' },
});
