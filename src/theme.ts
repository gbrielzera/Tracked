// Identidade "selo de disco": fundo berinjela, acento mostarda, apoio em verde-água.
export const colors = {
  ink: '#17121F',
  sleeve: '#231C30',
  groove: '#382E4A',
  paper: '#F1ECF8',
  fog: '#A79DBD',
  mustard: '#F0B429',
  teal: '#5CD6C0',
  danger: '#FF7A7A',

  // aliases semânticos usados pelas telas
  background: '#17121F',
  surface: '#231C30',
  border: '#382E4A',
  text: '#F1ECF8',
  textMuted: '#A79DBD',
  accent: '#F0B429',
  star: '#F0B429',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { field: 12, button: 14, sheet: 24 } as const;

export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  extra: 'BricolageGrotesque_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.extra, fontSize: 60, lineHeight: 62, letterSpacing: -2 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
} as const;
