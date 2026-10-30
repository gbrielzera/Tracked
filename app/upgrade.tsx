import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { authErrorMessage } from '@/features/auth/errors';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { SignupValues, signupSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { colors, spacing, type } from '@/theme';

// Visitante vira conta mantendo o mesmo usuário, então os comentários continuam dele.
export default function UpgradeScreen() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const { error } = await supabase.auth.updateUser(
      { email, password },
      { emailRedirectTo: Linking.createURL('auth/callback') },
    );
    if (error) setFormError(authErrorMessage(error));
    else setSentTo(email);
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{sentTo ? 'Confira seu e-mail' : 'Criar conta'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" size={26} color={colors.paper} />
        </Pressable>
      </View>

      {sentTo ? (
        <>
          <Text style={styles.body}>
            Enviamos um link de confirmação para {sentTo}. Abra o link neste aparelho para concluir a conta.
          </Text>
          <Button label="Fechar" variant="secondary" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Seus comentários continuam seus. Com uma conta você também avalia, curte e segue.
          </Text>
          <View style={styles.form}>
            <ControlledField
              control={control}
              name="email"
              label="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            <ControlledField
              control={control}
              name="password"
              label="Senha"
              hint="Pelo menos 8 caracteres."
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <ControlledField
              control={control}
              name="confirm"
              label="Repita a senha"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
            {formError ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {formError}
              </Text>
            ) : null}
            <Button label="Criar conta" loading={isSubmitting} onPress={onSubmit} />
          </View>
          <GoogleButton link label="Criar com o Google" onError={setFormError} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.title, color: colors.paper },
  body: { ...type.body, color: colors.fog },
  form: { gap: spacing.md },
  error: { ...type.small, color: colors.danger },
});
