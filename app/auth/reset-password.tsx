import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ControlledField } from '@/components/TextField';
import { authErrorMessage } from '@/features/auth/errors';
import { exchangeCodeOnce } from '@/features/auth/exchange';
import { ResetValues, resetSchema } from '@/lib/validation';
import { supabase } from '@/services/supabase/client';
import { colors, spacing, type } from '@/theme';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

// Destino de tracked://auth/reset-password: troca o código por sessão e define a nova senha.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [phase, setPhase] = useState<Phase>('checking');
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof code !== 'string') {
        const { data } = await supabase.auth.getSession();
        if (active) setPhase(data.session ? 'ready' : 'invalid');
        return;
      }
      const { error } = await exchangeCodeOnce(code);
      if (active) setPhase(error ? 'invalid' : 'ready');
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setFormError(authErrorMessage(error));
    else setPhase('done');
  });

  if (phase === 'checking') {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator color={colors.mustard} size="large" />
      </Screen>
    );
  }

  if (phase === 'invalid') {
    return (
      <Screen scroll={false} style={styles.center}>
        <Text style={styles.title}>Link inválido ou expirado</Text>
        <Text style={styles.body}>Peça um novo link de recuperação na tela de entrada.</Text>
        <Button label="Voltar ao início" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen scroll={false} style={styles.center}>
        <Text style={styles.title}>Senha atualizada</Text>
        <Text style={styles.body}>Você já está dentro da sua conta.</Text>
        <Button label="Continuar" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Nova senha</Text>
      <View style={styles.form}>
        <ControlledField
          control={control}
          name="password"
          label="Nova senha"
          hint="Pelo menos 8 caracteres."
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <ControlledField
          control={control}
          name="confirm"
          label="Repita a nova senha"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        {formError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button label="Salvar nova senha" loading={isSubmitting} onPress={onSubmit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  title: { ...type.title, color: colors.paper },
  body: { ...type.body, color: colors.fog },
  form: { gap: spacing.md, marginTop: spacing.sm },
  error: { ...type.small, color: colors.danger },
});
