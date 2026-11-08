import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { staffGeometry, stemsUp } from '@/lib/staff';
import { colors } from '@/theme';

type NoteSpec = {
  // Posição na pauta de cada cabeça (ver lib/staff.ts); duas posições = colcheias ligadas.
  steps: number[];
  // Onde a nota está no percurso quando a animação começa (0 a 1), para elas não saírem em fila.
  phase: number;
  color: string;
};

// Uma frase curta que se repete: notas de alturas e cores diferentes, espalhadas pelo percurso.
const NOTES: NoteSpec[] = [
  { steps: [2], phase: 0.0, color: colors.mustard },
  { steps: [3, 4], phase: 0.2, color: colors.teal },
  { steps: [5], phase: 0.4, color: colors.paper },
  { steps: [4, 2], phase: 0.6, color: colors.mustard },
  { steps: [1], phase: 0.8, color: colors.teal },
];

// Quanto leva uma nota para atravessar a pauta.
const TRAVEL_MS = 5200;
const STAFF_LINE = 'rgba(241, 236, 248, 0.16)';

type Props = {
  // Versão pequena, para dentro de listas e cartões.
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function Note({ spec, scale }: { spec: NoteSpec; scale: number }) {
  const g = staffGeometry(scale);
  const up = stemsUp(spec.steps);
  const heads = spec.steps.map((step, index) => ({ x: index * g.pairGap, y: g.headY(step) }));
  const width = (spec.steps.length - 1) * g.pairGap + g.headW;

  // Haste: de cada cabeça até uma altura comum (uma só, para a barra de ligação ficar reta).
  const ys = heads.map((head) => head.y);
  const stemEnd = up ? Math.min(...ys) - g.stemH : Math.max(...ys) + g.stemH;
  const stemX = (headX: number) => (up ? headX + g.headW - g.stemW : headX);
  const stemTop = (headY: number) => (up ? stemEnd : headY);
  const stemLength = (headY: number) => (up ? headY - stemEnd : stemEnd - headY);

  const beam =
    heads.length > 1
      ? {
          left: stemX(heads[0].x),
          width: stemX(heads[heads.length - 1].x) - stemX(heads[0].x) + g.stemW,
          top: up ? stemEnd : stemEnd - g.beamH,
        }
      : null;

  return (
    <View style={{ width, height: g.height }}>
      {heads.map((head, index) => (
        <View key={index}>
          <View
            style={[
              styles.head,
              {
                left: head.x,
                top: head.y - g.headH / 2,
                width: g.headW,
                height: g.headH,
                borderRadius: g.headH / 2,
                backgroundColor: spec.color,
              },
            ]}
          />
          <View
            style={{
              position: 'absolute',
              left: stemX(head.x),
              top: stemTop(head.y),
              width: g.stemW,
              height: stemLength(head.y),
              backgroundColor: spec.color,
            }}
          />
        </View>
      ))}
      {beam ? (
        <View
          style={{
            position: 'absolute',
            left: beam.left,
            top: beam.top,
            width: beam.width,
            height: g.beamH,
            backgroundColor: spec.color,
          }}
        />
      ) : null}
    </View>
  );
}

// Carregando: notas musicais "passando" por uma partitura translúcida, sobre o fundo do app.
// Quem pediu para reduzir animações no celular vê a partitura parada.
export function MusicLoader({ compact = false, style }: Props) {
  const scale = compact ? 0.6 : 1;
  const g = useMemo(() => staffGeometry(scale), [scale]);

  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(NOTES.map((note) => new Animated.Value(note.phase))).current;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduceMotion(value));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || width === 0) return;
    const loops = progress.map((value, index) => {
      const run = (from: number) => {
        value.setValue(from);
        Animated.timing(value, {
          toValue: 1,
          duration: (1 - from) * TRAVEL_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) run(0);
        });
      };
      run(NOTES[index].phase);
      return value;
    });
    return () => loops.forEach((value) => value.stopAnimation());
  }, [reduceMotion, width, progress]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  // O estilo de quem chama (margem, espaçamento) fica num View de fora, para não deslocar a partitura.
  return (
    <View style={style}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando"
        onLayout={onLayout}
        style={[styles.root, { height: g.height, maxWidth: compact ? 240 : 340 }]}
      >
        <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" pointerEvents="none">
          {/* as 5 linhas da pauta e a barra do começo */}
          {[0, 1, 2, 3, 4].map((line) => (
            <View key={line} style={[styles.line, { top: g.lineY(line) }]} />
          ))}
          <View style={[styles.bar, { top: g.lineY(0), height: 4 * g.gap }]} />

          {width > 0
            ? NOTES.map((spec, index) => {
                const noteWidth = (spec.steps.length - 1) * g.pairGap + g.headW;
                const value = progress[index];
                const x = value.interpolate({ inputRange: [0, 1], outputRange: [-noteWidth, width] });
                // Some e aparece nas pontas, para as notas não surgirem do nada.
                const opacity = value.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 1, 1, 0] });
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.noteWrap,
                      reduceMotion ? { left: spec.phase * (width - noteWidth) } : { opacity, transform: [{ translateX: x }] },
                    ]}
                  >
                    <Note spec={spec} scale={scale} />
                  </Animated.View>
                );
              })
            : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'center', width: '100%', overflow: 'hidden' },
  line: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: STAFF_LINE },
  bar: { position: 'absolute', left: 0, width: 1.5, backgroundColor: STAFF_LINE },
  noteWrap: { position: 'absolute', left: 0, top: 0 },
  head: { position: 'absolute', transform: [{ rotate: '-20deg' }] },
});
