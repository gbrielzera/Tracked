import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCount } from '@/lib/format';
import type { MediaItem } from '@/services/music';
import { colors, fonts, radius, spacing, type } from '@/theme';
import { useMusicInfo } from './useMusicInfo';

// Descrição curta do Last.fm. Se não houver ou falhar, o bloco simplesmente não aparece.
export function DescriptionBlock({ item }: { item: MediaItem }) {
  const { data } = useMusicInfo(item);
  const [expanded, setExpanded] = useState(false);

  if (!data || (!data.summary && data.tags.length === 0)) return null;

  const listeners = formatCount(data.listeners);

  return (
    <View style={styles.block}>
      {data.summary ? (
        <View style={styles.summaryWrap}>
          <Text style={styles.summary} numberOfLines={expanded ? undefined : 5}>
            {data.summary}
          </Text>
          {data.summary.length > 220 ? (
            <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.more}>{expanded ? 'Mostrar menos' : 'Ler mais'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {data.tags.length > 0 ? (
        <View style={styles.tags}>
          {data.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagLabel}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        {listeners ? <Text style={styles.meta}>{listeners} ouvintes no Last.fm</Text> : null}
        {data.url ? (
          <Pressable onPress={() => void Linking.openURL(data.url!)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>Fonte: Last.fm</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  summaryWrap: { gap: spacing.sm },
  summary: { ...type.body, color: colors.paper },
  more: { fontFamily: fonts.bold, fontSize: 15, color: colors.teal },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.field, backgroundColor: colors.groove },
  tagLabel: { ...type.small, color: colors.paper },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  meta: { ...type.small, color: colors.fog },
  link: { ...type.small, color: colors.teal },
});
