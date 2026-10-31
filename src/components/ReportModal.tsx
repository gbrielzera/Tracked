import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '@/theme';

const REASONS = ['Spam ou propaganda', 'Ofensivo ou assédio', 'Fora do assunto', 'Outro motivo'];

type Props = {
  visible: boolean;
  title: string;
  busy?: boolean;
  onClose: () => void;
  onSelect: (reason: string) => void;
};

// Folha inferior para escolher o motivo da denúncia.
export function ReportModal({ visible, title, busy, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        {busy ? (
          <ActivityIndicator color={colors.mustard} style={styles.busy} />
        ) : (
          REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => onSelect(reason)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionLabel}>{reason}</Text>
            </Pressable>
          ))
        )}
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.sleeve,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: { ...type.subtitle, color: colors.paper, marginBottom: spacing.sm },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.field },
  pressed: { backgroundColor: colors.groove },
  optionLabel: { ...type.body, color: colors.paper },
  busy: { paddingVertical: spacing.lg },
  cancel: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  cancelLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
});
