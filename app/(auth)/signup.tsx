import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { authErrorMessage } from '@/features/auth/errors';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { SignupValues, signupSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { colors, fonts, spacing, type } from '@/theme';

export default function SignupScreen() {
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: Linking.createURL('auth/callback') },
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    // E-mail já cadastrado: o Supabase responde sem erro, mas sem identidades.
    if (data.user && data.user.identities?.length === 0) {
      setFormError(authErrorMessage({ code: 'email_exists', name: 'AuthApiError' }));
      return;
    }
    // Com confirmação de e-mail ativa não há sessão ainda.
    if (!data.session) setSentTo(email);
  });

  if (sentTo) {
    return (
      <Screen edges={['bottom']}>
        <Text style={styles.title}>Confira seu e-mail</Text>
        <Text style={styles.body}>
          Enviamos um link de confirmação para {sentTo}. Abra o link neste aparelho para entrar.
        </Text>
        <Button label="Voltar para entrar" variant="secondary" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Text style={styles.title}>Criar conta</Text>

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

      <GoogleButton onError={setFormError} />

      <Text style={styles.footer}>
        Já tem conta?{' '}
        <Link href="/login" style={styles.footerLink}>
          Entrar
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.paper, marginBottom: spacing.sm },
  body: { ...type.body, color: colors.fog },
  form: { gap: spacing.md },
  error: { ...type.small, color: colors.danger },
  footer: { ...type.body, color: colors.fog, textAlign: 'center', marginTop: spacing.sm },
  footerLink: { fontFamily: fonts.bold, color: colors.teal },
});
