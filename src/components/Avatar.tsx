import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts } from '@/theme';

type Props = { uri?: string | null; name?: string | null; size?: number };

export function Avatar({ uri, name, size = 96 }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    // A URL do avatar muda quando a foto muda (?v=...), então o cache não segura foto velha.
    return (
      <Image
        source={{ uri }}
        style={[styles.image, box]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        accessibilityLabel="Foto de perfil"
      />
    );
  }
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, box]} accessibilityLabel="Foto de perfil">
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.groove },
  fallback: { backgroundColor: colors.groove, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.paper, fontFamily: fonts.bold },
});
