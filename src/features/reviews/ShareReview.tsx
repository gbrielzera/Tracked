import { forwardRef, useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { MediaCover } from '@/components/MediaCover';
import { StarRating } from '@/components/StarRating';
import { formatRating } from '@/lib/format';
import { deezerImageAt } from '@/lib/images';
import { colors, fonts, radius, spacing } from '@/theme';
import type { ReviewCard } from './queries';

// view-shot (tira a "foto" do cartão) e expo-sharing (abre o menu de compartilhar) são nativos:
// um APK gerado antes deles não os tem, e importar direto derrubaria o app. Carrega com segurança.
type ShotModule = typeof import('react-native-view-shot');
type SharingModule = typeof import('expo-sharing');
let shot: ShotModule | null = null;
let sharing: SharingModule | null = null;
try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  shot = require('react-native-view-shot') as ShotModule;
  sharing = require('expo-sharing') as SharingModule;
  /* eslint-enable @typescript-eslint/no-require-imports */
} catch {
  shot = null;
  sharing = null;
}

const UPDATE_MESSAGE = 'Para compartilhar imagens, instale a versão mais nova do app (APK).';

// Desenho em 360 x 640 (9:16), escalado pela largura real; a imagem final sai em 1080 x 1920.
const BASE_WIDTH = 360;
const EQ_BARS = [8, 15, 22, 12, 18];

type CardProps = { review: ReviewCard; width: number; onReady: () => void };

// O cartão em si: capa, título, artista, nota, texto, quem escreveu e a marca do Tracked.
const ShareCard = forwardRef<React.ComponentRef<typeof View>, CardProps>(function ShareCard({ review, width, onReady }, ref) {
  const u = width / BASE_WIDTH;
  const cover = deezerImageAt(review.mediaCoverUrl, 1000);
  const coverSize = width - 56 * u;
  const round = review.mediaKind === 'artist';

  // Sem capa, já está pronto; com capa, espera ela carregar (ou falhar) para a foto não sair vazia.
  useEffect(() => {
    if (!cover) onReady();
  }, [cover, onReady]);

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height: (width * 16) / 9, padding: 28 * u }]}>
      <View style={[styles.brand, { gap: 8 * u }]}>
        <View style={[styles.eq, { gap: 2 * u, height: 22 * u }]}>
          {EQ_BARS.map((h, i) => (
            <View key={i} style={{ width: 3 * u, height: h * u, borderRadius: 2 * u, backgroundColor: colors.mustard }} />
          ))}
        </View>
        <Text style={[styles.brandName, { fontSize: 22 * u }]}>Tracked</Text>
      </View>

      <View style={{ marginTop: 22 * u, alignItems: 'center' }}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{ width: coverSize, height: coverSize, borderRadius: round ? coverSize / 2 : 18 * u, backgroundColor: colors.groove }}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={onReady}
            onError={onReady}
          />
        ) : (
          <MediaCover uri={null} size={coverSize} round={round} />
        )}
      </View>

      <Text style={[styles.title, { fontSize: 25 * u, lineHeight: 30 * u, marginTop: 20 * u }]} numberOfLines={2}>
        {review.mediaTitle}
      </Text>
      {review.mediaArtistName && review.mediaKind !== 'artist' ? (
        <Text style={[styles.artist, { fontSize: 16 * u, marginTop: 2 * u }]} numberOfLines={1}>
          {review.mediaArtistName}
        </Text>
      ) : null}

      <View style={[styles.ratingRow, { marginTop: 12 * u, gap: 10 * u }]}>
        <StarRating value={review.rating} size={24 * u} />
        <Text style={[styles.ratingValue, { fontSize: 20 * u }]}>{formatRating(review.rating)}</Text>
      </View>

      {review.body ? (
        <Text style={[styles.body, { fontSize: 15 * u, lineHeight: 22 * u, marginTop: 12 * u }]} numberOfLines={5}>
          “{review.body}”
        </Text>
      ) : null}

      <View style={styles.spacer} />

      <View style={[styles.footer, { paddingTop: 14 * u, gap: 10 * u }]}>
        <Avatar uri={review.authorAvatarUrl} name={review.authorDisplayName} size={34 * u} />
        <View style={styles.footerText}>
          <Text style={[styles.author, { fontSize: 15 * u }]} numberOfLines={1}>
            {review.authorUsername ? `@${review.authorUsername}` : review.authorDisplayName}
          </Text>
          <Text style={[styles.footerHint, { fontSize: 12 * u }]}>avaliou no Tracked</Text>
        </View>
      </View>
    </View>
  );
});

type SheetProps = { review: ReviewCard; visible: boolean; onClose: () => void };

// Prévia do cartão com o botão que gera a imagem e abre o menu de compartilhar do celular.
export function ShareReviewSheet({ review, visible, onClose }: SheetProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const cardWidth = Math.min(screenW - 48, ((screenH - 220) * 9) / 16, BASE_WIDTH);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const available = !!shot && !!sharing;

  useEffect(() => {
    if (!visible) setReady(false);
  }, [visible]);

  const share = async () => {
    if (!shot || !sharing) {
      Alert.alert('Atualize o app', UPDATE_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const uri = await shot.captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      if (!(await sharing.isAvailableAsync())) throw new Error('sharing_unavailable');
      await sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar review', UTI: 'public.png' });
    } catch {
      Alert.alert('Não foi possível compartilhar', `Tente de novo. Se continuar, ${UPDATE_MESSAGE.charAt(0).toLowerCase()}${UPDATE_MESSAGE.slice(1)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ShareCard ref={cardRef} review={review} width={cardWidth} onReady={() => setReady(true)} />
        {!available ? <Text style={styles.hint}>{UPDATE_MESSAGE}</Text> : null}
        <View style={[styles.actions, { width: cardWidth }]}>
          <View style={styles.action}>
            <Button label="Fechar" variant="secondary" onPress={onClose} disabled={busy} />
          </View>
          <View style={styles.action}>
            <Button
              label="Compartilhar"
              icon="share-social-outline"
              loading={busy || (available && !ready)}
              disabled={!available}
              onPress={() => void share()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 15, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  card: { backgroundColor: colors.ink, borderRadius: radius.sheet, overflow: 'hidden' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  eq: { flexDirection: 'row', alignItems: 'flex-end' },
  brandName: { fontFamily: fonts.extra, color: colors.paper, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, color: colors.paper, letterSpacing: -0.4 },
  artist: { fontFamily: fonts.medium, color: colors.fog },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingValue: { fontFamily: fonts.bold, color: colors.mustard },
  body: { fontFamily: fonts.regular, color: colors.paper },
  spacer: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.groove },
  footerText: { flex: 1 },
  author: { fontFamily: fonts.semibold, color: colors.paper },
  footerHint: { fontFamily: fonts.regular, color: colors.fog },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.fog, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
