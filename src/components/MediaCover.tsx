import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type Props = { uri?: string | null; size: number; round?: boolean };

export function MediaCover({ uri, size, round = false }: Props) {
  const box = { width: size, height: size, borderRadius: round ? size / 2 : Math.max(6, size * 0.08) };
  if (uri) {
    // Capa é decorativa: o título e o artista ao lado já dizem o que é.
    // Cache em memória e disco (não pisca ao voltar para a tela); a URL como chave de reciclagem
    // impede que, numa lista rolando rápido, a capa de outra linha apareça por um instante.
    return (
      <Image
        source={{ uri }}
        style={[styles.image, box]}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        accessible={false}
      />
    );
  }
  return (
    <View style={[styles.fallback, box]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ionicons name={round ? 'person' : 'musical-notes'} size={size * 0.4} color={colors.fog} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.groove },
  fallback: { backgroundColor: colors.groove, alignItems: 'center', justifyContent: 'center' },
});
