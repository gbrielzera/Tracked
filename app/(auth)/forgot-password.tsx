import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { authErrorMessage } from '@/features/auth/errors';
import { ForgotValues, forgotSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { colors, spacing, type } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('auth/reset-password'),
    });
    if (error) setFormError(authErrorMessage(error));
    else setSent(true);
  });

  if (sent) {
    return (
      <Screen edges={['bottom']}>
        <Text style={styles.title}>Confira seu e-mail</Text>
        <Text style={styles.body}>
          Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Abra o link
          neste aparelho.
        </Text>
        <Button label="Voltar para entrar" variant="secondary" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Text style={styles.title}>Recuperar senha</Text>
      <Text style={styles.body}>Digite o e-mail da sua conta. Vamos enviar um link para criar uma nova senha.</Text>

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
        {formError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button label="Enviar link" loading={isSubmitting} onPress={onSubmit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.paper },
  body: { ...type.body, color: colors.fog },
  form: { gap: spacing.md, marginTop: spacing.sm },
  error: { ...type.small, color: colors.danger },
});
