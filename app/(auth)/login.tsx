import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { authErrorMessage } from '@/features/auth/errors';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { LoginValues, loginSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { colors, fonts, spacing, type } from '@/theme';

export default function LoginScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) setFormError(authErrorMessage(error));
  });

  return (
    <Screen edges={['bottom']}>
      <Text style={styles.title}>Entrar</Text>

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
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
        />
        <Link href="/forgot-password" style={styles.link}>
          Esqueci minha senha
        </Link>
        {formError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button label="Entrar" loading={isSubmitting} onPress={onSubmit} />
      </View>

      <GoogleButton onError={setFormError} />

      <Text style={styles.footer}>
        Ainda não tem conta?{' '}
        <Link href="/signup" style={styles.footerLink}>
          Criar conta
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.paper, marginBottom: spacing.sm },
  form: { gap: spacing.md },
  link: { ...type.label, color: colors.teal, alignSelf: 'flex-start' },
  error: { ...type.small, color: colors.danger },
  footer: { ...type.body, color: colors.fog, textAlign: 'center', marginTop: spacing.sm },
  footerLink: { fontFamily: fonts.bold, color: colors.teal },
});
