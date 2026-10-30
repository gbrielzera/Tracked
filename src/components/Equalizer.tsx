import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

const HEIGHTS = [18, 34, 52, 28, 72, 40, 22, 48, 30];
const TALLEST = HEIGHTS.indexOf(Math.max(...HEIGHTS));

// Único movimento do app ao abrir: as barras sobem uma vez. Sem animação se o sistema pedir.
export function Equalizer() {
  const bars = useRef(HEIGHTS.map(() => new Animated.Value(4))).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        bars.forEach((bar, i) => bar.setValue(HEIGHTS[i]));
        return;
      }
      Animated.stagger(
        70,
        bars.map((bar, i) =>
          Animated.timing(bar, {
            toValue: HEIGHTS[i],
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ),
      ).start();
    });
    return () => {
      cancelled = true;
    };
  }, [bars]);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((height, i) => (
        <Animated.View
          key={i}
          style={[styles.bar, { height, backgroundColor: i === TALLEST ? colors.teal : colors.mustard }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 72 },
  bar: { width: 9, borderRadius: 3 },
});
