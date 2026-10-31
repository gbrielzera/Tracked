// Países para a nacionalidade do perfil e para o filtro do Trending.
// O código é o ISO 3166-1 alfa-2; a bandeira é montada a partir dele (sem imagens).

export type Country = { code: string; name: string };

export const COUNTRIES: Country[] = [
  ['AO', 'Angola'], ['SA', 'Arábia Saudita'], ['AR', 'Argentina'], ['AU', 'Austrália'], ['AT', 'Áustria'],
  ['BE', 'Bélgica'], ['BO', 'Bolívia'], ['BR', 'Brasil'], ['CV', 'Cabo Verde'], ['CA', 'Canadá'],
  ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colômbia'], ['KR', 'Coreia do Sul'], ['CR', 'Costa Rica'],
  ['CU', 'Cuba'], ['DK', 'Dinamarca'], ['EG', 'Egito'], ['AE', 'Emirados Árabes Unidos'], ['EC', 'Equador'],
  ['DE', 'Alemanha'], ['ES', 'Espanha'], ['US', 'Estados Unidos'], ['FI', 'Finlândia'], ['FR', 'França'], ['GR', 'Grécia'],
  ['GW', 'Guiné-Bissau'], ['HU', 'Hungria'], ['IN', 'Índia'], ['ID', 'Indonésia'], ['IE', 'Irlanda'],
  ['IL', 'Israel'], ['IT', 'Itália'], ['JP', 'Japão'], ['MA', 'Marrocos'], ['MX', 'México'],
  ['MZ', 'Moçambique'], ['NG', 'Nigéria'], ['NO', 'Noruega'], ['NZ', 'Nova Zelândia'], ['NL', 'Países Baixos'],
  ['PA', 'Panamá'], ['PY', 'Paraguai'], ['PE', 'Peru'], ['PH', 'Filipinas'], ['PL', 'Polônia'],
  ['PT', 'Portugal'], ['GB', 'Reino Unido'], ['CZ', 'Tchéquia'], ['DO', 'República Dominicana'], ['RO', 'Romênia'],
  ['RU', 'Rússia'], ['ST', 'São Tomé e Príncipe'], ['ZA', 'África do Sul'], ['SE', 'Suécia'], ['CH', 'Suíça'],
  ['TH', 'Tailândia'], ['TL', 'Timor-Leste'], ['TR', 'Turquia'], ['UA', 'Ucrânia'], ['UY', 'Uruguai'],
  ['VE', 'Venezuela'], ['VN', 'Vietnã'],
]
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt'));

const NAMES = new Map(COUNTRIES.map((country) => [country.code, country.name]));

export const countryName = (code: string | null | undefined) => (code ? (NAMES.get(code) ?? null) : null);

// "BR" -> bandeira do Brasil. Cada letra vira o símbolo regional equivalente (A = U+1F1E6).
export function flagOf(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}
