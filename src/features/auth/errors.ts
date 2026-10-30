import type { AuthError } from '@supabase/supabase-js';

export function authErrorMessage(error: Pick<AuthError, 'code' | 'name'> | null | undefined) {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com este e-mail.';
    case 'weak_password':
      return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'anonymous_provider_disabled':
      return 'O acesso como visitante não está ativo no servidor.';
    case 'manual_linking_disabled':
      return 'Vincular o Google não está ativo no servidor.';
  }
  if (error?.name === 'AuthRetryableFetchError') return 'Sem conexão. Verifique sua internet.';
  return 'Algo deu errado. Tente de novo.';
}
