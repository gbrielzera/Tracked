import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { MusicLoader } from '@/components/MusicLoader';
import { classifyFailure, FAILURE_MESSAGES } from '@/lib/errors';
import { useOnline } from '@/lib/network';
import { colors, spacing, type } from '@/theme';

export function LoadingState() {
  return (
    <View style={styles.center}>
      <MusicLoader />
    </View>
  );
}

type EmptyProps = { title: string; body?: string; actionLabel?: string; onAction?: () => void };

export function EmptyState({ title, body, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} variant="secondary" onPress={onAction} /> : null}
    </View>
  );
}

type ErrorProps = { error: unknown; message?: string; onRetry?: () => void };

// O título diz o que falhou (ou a mensagem da tela); a linha de baixo diz por quê:
// sem internet, servidor do Tracked fora do ar ou catálogo de músicas indisponível.
export function ErrorState({ error, message, onRetry }: ErrorProps) {
  const kind = classifyFailure(error, useOnline());
  const reason = FAILURE_MESSAGES[kind];

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{message ?? reason}</Text>
      {message && kind !== 'unknown' ? <Text style={styles.body}>{reason}</Text> : null}
      {onRetry ? <Button label="Tentar de novo" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...type.subtitle, color: colors.paper, textAlign: 'center' },
  body: { ...type.body, color: colors.fog, textAlign: 'center' },
});
