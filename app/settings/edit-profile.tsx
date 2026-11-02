import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CountryPicker } from '@/components/CountryPicker';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { refreshProfile } from '@/features/auth/bootstrap';
import { unregisterPush } from '@/features/notifications/push';
import { uploadAvatar } from '@/features/profile/avatar';
import { COUNTRIES, countryName, flagOf } from '@/lib/countries';
import { EditProfileValues, editProfileSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/stores/auth';
import { colors, fonts, radius, spacing, type } from '@/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [reviewsPrivate, setReviewsPrivate] = useState(profile?.reviews_private ?? false);
  const [country, setCountry] = useState<string | null>(profile?.country ?? null);
  const [pickingCountry, setPickingCountry] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { displayName: profile?.display_name ?? '', bio: profile?.bio ?? '' },
  });

  // Ao sair, este aparelho deixa de receber os avisos da conta.
  const signOut = async () => {
    await unregisterPush();
    await supabase.auth.signOut();
  };

  // Apaga a conta de verdade (avatar, reviews, comentários, curtidas): a função do servidor
  // identifica a pessoa pelo login, então só dá para excluir a própria conta.
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await unregisterPush();
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw error;
      queryClient.clear();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      setDeleting(false);
      Alert.alert('Não foi possível excluir', 'Sua conta continua ativa. Verifique a conexão e tente de novo.');
    }
  };
  const confirmDelete = () =>
    Alert.alert(
      'Excluir conta?',
      'Seu perfil, suas reviews, comentários e curtidas serão apagados para sempre. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir conta', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setLocalUri(result.assets[0].uri);
  };

  const onSubmit = handleSubmit(async ({ displayName, bio }) => {
    if (!session) return;
    setFormError(null);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (localUri) avatarUrl = await uploadAvatar(session.user.id, localUri);

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio.trim() || null,
          reviews_private: reviewsPrivate,
          country,
          avatar_url: avatarUrl,
        })
        .eq('id', session.user.id);
      if (error) throw error;

      await refreshProfile();
      // A privacidade e os dados do perfil aparecem em várias telas.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
      ]);
      router.back();
    } catch {
      setFormError('Não foi possível salvar. Verifique sua conexão e tente de novo.');
    }
  });

  return (
    <Screen edges={['bottom']}>
      <Pressable
        onPress={pickPhoto}
        style={styles.photo}
        accessibilityRole="button"
        accessibilityLabel="Trocar foto de perfil"
      >
        <Avatar uri={localUri ?? profile?.avatar_url} name={profile?.display_name} size={88} />
        <View style={styles.photoText}>
          <Text style={styles.photoLabel}>Trocar foto</Text>
          <Text style={styles.handle}>@{profile?.username}</Text>
        </View>
      </Pressable>

      <View style={styles.form}>
        <ControlledField control={control} name="displayName" label="Nome exibido" autoComplete="name" />
        <ControlledField
          control={control}
          name="bio"
          label="Bio"
          hint="Até 160 caracteres."
          multiline
          maxLength={160}
        />

        <Pressable
          onPress={() => setPickingCountry(true)}
          accessibilityRole="button"
          accessibilityLabel={`País: ${countryName(country) ?? 'não informado'}. Toque para mudar.`}
          style={styles.countryRow}
        >
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>País</Text>
            <Text style={styles.switchHint}>Aparece no seu perfil com a bandeira.</Text>
          </View>
          <Text style={styles.countryValue}>
            {country ? `${flagOf(country)} ${countryName(country)}` : 'Não informado'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.fog} />
        </Pressable>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Reviews privadas</Text>
            <Text style={styles.switchHint}>
              Ligado, só você vê suas reviews: no perfil, no feed de quem te segue e nas páginas das músicas.
            </Text>
          </View>
          <Switch
            value={reviewsPrivate}
            onValueChange={setReviewsPrivate}
            trackColor={{ false: colors.groove, true: colors.mustard }}
            thumbColor={colors.paper}
            accessibilityLabel="Reviews privadas"
          />
        </View>

        {formError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button label="Salvar" loading={isSubmitting} onPress={onSubmit} />
      </View>

      <CountryPicker
        visible={pickingCountry}
        title="Seu país"
        countries={COUNTRIES}
        selected={country}
        noneLabel="Não informar"
        noneIcon="🚫"
        onSelect={(code) => {
          setCountry(code);
          setPickingCountry(false);
        }}
        onClose={() => setPickingCountry(false)}
      />

      <View style={styles.more}>
        <Button
          label="Editar artistas favoritos"
          variant="secondary"
          icon="star-outline"
          onPress={() => router.push('/settings/favorites')}
        />
        <Button
          label="Editar músicas do momento"
          variant="secondary"
          icon="musical-notes-outline"
          onPress={() => router.push('/settings/favorite-tracks')}
        />
        <Button label="Sair da conta" variant="ghost" onPress={() => void signOut()} disabled={deleting} />
        <Button label="Excluir conta" variant="danger" loading={deleting} onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoText: { gap: 2 },
  photoLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
  handle: { ...type.body, color: colors.fog },
  form: { gap: spacing.md, marginTop: spacing.sm },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.field,
    backgroundColor: colors.sleeve,
  },
  countryValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.field,
    backgroundColor: colors.sleeve,
  },
  switchText: { flex: 1, gap: 4 },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  switchHint: { ...type.small, color: colors.fog },
  error: { ...type.small, color: colors.danger },
  more: { gap: spacing.sm, marginTop: spacing.lg },
});
