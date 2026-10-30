import { useMemo, useRef, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRating } from '@/lib/format';
import { colors, fonts } from '@/theme';

type Props = {
  value: number;
  // Sem onChange o componente é só de leitura.
  onChange?: (value: number) => void;
  size?: number;
  showValue?: boolean;
};

const GAP = 4;
const STEP = 0.5;

function iconFor(value: number, star: number): 'star' | 'star-half' | 'star-outline' {
  if (value >= star) return 'star';
  if (value >= star - STEP) return 'star-half';
  return 'star-outline';
}

// Estrelas com meia estrela (0,5 a 5). Toque ou arraste para escolher; soltar confirma.
export function StarRating({ value, onChange, size = 28, showValue = false }: Props) {
  const interactive = !!onChange;
  const [draft, setDraft] = useState<number | null>(null);
  const widthRef = useRef(1);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const toValue = (x: number) => {
    const raw = Math.ceil((x / widthRef.current) * 10) / 2;
    return Math.min(5, Math.max(STEP, raw));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onChangeRef.current,
        onMoveShouldSetPanResponder: () => !!onChangeRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => setDraft(toValue(event.nativeEvent.locationX)),
        onPanResponderMove: (event) => setDraft(toValue(event.nativeEvent.locationX)),
        onPanResponderRelease: (event) => {
          const next = toValue(event.nativeEvent.locationX);
          setDraft(null);
          onChangeRef.current?.(next);
        },
        onPanResponderTerminate: () => setDraft(null),
      }),
    [],
  );

  const shown = interactive ? (draft ?? value) : Math.round(value * 2) / 2;

  const onAction = (event: AccessibilityActionEvent) => {
    if (!onChange) return;
    if (event.nativeEvent.actionName === 'increment') onChange(Math.min(5, value + STEP));
    if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(STEP, value - STEP));
  };

  return (
    <View style={styles.row}>
      <View
        {...(interactive ? responder.panHandlers : {})}
        onLayout={(event: LayoutChangeEvent) => {
          widthRef.current = event.nativeEvent.layout.width || 1;
        }}
        style={styles.stars}
        accessible
        accessibilityRole={interactive ? 'adjustable' : 'image'}
        accessibilityLabel={interactive ? 'Sua nota' : 'Nota'}
        accessibilityValue={{ text: shown > 0 ? `${formatRating(shown)} de 5 estrelas` : 'sem nota' }}
        accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
        onAccessibilityAction={onAction}
      >
        {/* O container recebe o toque inteiro, o que dá coordenadas estáveis. */}
        <View style={styles.starsInner}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={iconFor(shown, star)}
              size={size}
              color={shown >= star - STEP ? colors.star : colors.groove}
            />
          ))}
        </View>
      </View>
      {showValue ? <Text style={[styles.value, { fontSize: size * 0.8 }]}>{shown > 0 ? formatRating(shown) : '–'}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stars: { flexDirection: 'row' },
  starsInner: { flexDirection: 'row', gap: GAP, pointerEvents: 'none' },
  value: { fontFamily: fonts.bold, color: colors.paper },
});
