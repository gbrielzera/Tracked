import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '@/theme';

type Stat = { label: string; value: number | string; onPress?: () => void };

export function ProfileStats({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Pressable
          key={stat.label}
          onPress={stat.onPress}
          disabled={!stat.onPress}
          accessibilityRole={stat.onPress ? 'button' : 'text'}
          accessibilityLabel={`${stat.value} ${stat.label}`}
          style={styles.stat}
        >
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2, paddingVertical: 6 },
  value: { fontFamily: fonts.extra, fontSize: 24, lineHeight: 28, color: colors.paper, letterSpacing: -0.5 },
  label: { ...type.small, color: colors.fog },
});
