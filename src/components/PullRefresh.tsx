import { RefreshControl, RefreshControlProps } from 'react-native';
import { colors } from '@/theme';

// Indicador de "puxar para atualizar" com as cores do app nas duas plataformas
// (tintColor vale só no iOS; colors e progressBackgroundColor, só no Android).
// O ScrollView injeta a própria lista como filho (e o estilo) do refreshControl:
// por isso as demais props precisam seguir adiante, senão a lista some.
export function PullRefresh(props: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor={colors.mustard}
      colors={[colors.mustard]}
      progressBackgroundColor={colors.sleeve}
      {...props}
    />
  );
}
