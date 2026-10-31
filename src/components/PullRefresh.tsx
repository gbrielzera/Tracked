import { RefreshControl } from 'react-native';
import { colors } from '@/theme';

// Indicador de "puxar para atualizar" com as cores do app nas duas plataformas
// (tintColor vale só no iOS; colors e progressBackgroundColor, só no Android).
export function PullRefresh({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.mustard}
      colors={[colors.mustard]}
      progressBackgroundColor={colors.sleeve}
    />
  );
}
