import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius } from '@/theme';

type Option<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.pill, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  pill: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.groove,
  },
  selected: { backgroundColor: colors.groove, borderColor: colors.paper },
  label: { fontFamily: fonts.medium, fontSize: 15, color: colors.fog },
  selectedLabel: { color: colors.paper, fontFamily: fonts.bold },
});
