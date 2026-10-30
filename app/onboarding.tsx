import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { refreshProfile } from '@/features/auth/bootstrap';
import { uploadAvatar } from '@/features/profile/avatar';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { OnboardingValues, USERNAME_PATTERN, onboardingSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/stores/auth';
import { colors, fonts, spacing, type } from '@/theme';

type Availability = 'idle' | 'checking' | 'available' | 'taken';

const cleanUsername = (text: string) => text.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);

export default function OnboardingScreen() {
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>('idle');

  const initialName = profile?.display_name.startsWith('Visitante') ? '' : (profile?.display_name ?? '');
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { displayName: initialName, username: '' },
  });

  const username = useWatch({ control, name: 'username' });
  const debouncedUsername = useDebouncedValue(username, 500);

  useEffect(() => {
    if (!USERNAME_PATTERN.test(debouncedUsername)) {
      setAvailability('idle');
      return;
    }
    let active = true;
    setAvailability('checking');
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', debouncedUsername)
      .then(({ count, error }) => {
        if (!active) return;
        setAvailability(error ? 'idle' : count ? 'taken' : 'available');
      });
    return () => {
      active = false;
    };
  }, [debouncedUsername]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setLocalUri(result.assets[0].uri);
  };

  const onSubmit = handleSubmit(async ({ displayName, username: handle }) => {
    if (!session) return;
    setFormError(null);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (localUri) avatarUrl = await uploadAvatar(session.user.id, localUri);

      const { error } = await supabase
        .from('profiles')
        .update({ username: handle, display_name: displayName, avatar_url: avatarUrl })
        .eq('id', session.user.id);

      if (error) {
        if (error.code === '23505') setError('username', { message: 'Esse @ já está em uso.' });
        else setFormError('Não foi possível salvar. Tente de novo.');
        return;
      }
      await refreshProfile();
    } catch {
      setFormError('Não foi possível enviar a foto. Tente de novo.');
    }
  });

  return (
    <Screen>
      <Text style={styles.title}>Complete seu perfil</Text>
      <Text style={styles.body}>Escolha como as pessoas vão encontrar você no Tracked.</Text>

      <Pressable
        onPress={pickPhoto}
        style={styles.photo}
        accessibilityRole="button"
        accessibilityLabel={localUri ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
      >
        <Avatar uri={localUri ?? profile?.avatar_url} name={initialName || username} size={88} />
        <Text style={styles.photoLabel}>{localUri ? 'Trocar foto' : 'Escolher foto'}</Text>
      </Pressable>

      <View style={styles.form}>
        <ControlledField control={control} name="displayName" label="Nome exibido" autoComplete="name" />
        <View style={styles.usernameBlock}>
          <ControlledField
            control={control}
            name="username"
            label="Seu @"
            hint="De 3 a 20 letras minúsculas, números, ponto ou _."
            transform={cleanUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {availability === 'checking' ? <Text style={styles.status}>Verificando...</Text> : null}
          {availability === 'available' ? (
            <Text style={[styles.status, { color: colors.teal }]}>@{debouncedUsername} está disponível.</Text>
          ) : null}
          {availability === 'taken' ? (
            <Text style={[styles.status, { color: colors.danger }]}>@{debouncedUsername} já está em uso.</Text>
          ) : null}
        </View>

        {formError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button
          label="Começar"
          loading={isSubmitting}
          disabled={availability === 'taken'}
          onPress={onSubmit}
        />
        <Button label="Sair" variant="ghost" onPress={() => void supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.paper },
  body: { ...type.body, color: colors.fog },
  photo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm },
  photoLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
  form: { gap: spacing.md },
  usernameBlock: { gap: 6 },
  status: { ...type.small, color: colors.fog },
  error: { ...type.small, color: colors.danger },
});
