import { KeyboardAvoidingView, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  // Para a tela poder rolar sozinha até um campo (ex.: busca com a lista longa acima dela).
  scrollRef?: React.RefObject<React.ComponentRef<typeof ScrollView> | null>;
};

export function Screen({ children, scroll = true, edges = ['top', 'bottom'], style, scrollRef }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, style]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flex, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
});
