import { z } from 'zod';

const email = z.string().trim().email('Digite um e-mail válido.');
const password = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Digite sua senha.'),
});

export const signupSchema = z
  .object({ email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'As senhas não são iguais.',
  });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'As senhas não são iguais.',
  });

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Digite o nome que aparece no seu perfil.')
    .max(50, 'Use no máximo 50 caracteres.'),
  username: z
    .string()
    .regex(USERNAME_PATTERN, 'Use de 3 a 20 letras minúsculas, números, ponto ou _.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;

export const editProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Digite o nome que aparece no seu perfil.')
    .max(50, 'Use no máximo 50 caracteres.'),
  bio: z.string().max(160, 'Use no máximo 160 caracteres.'),
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;
