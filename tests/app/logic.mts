// Testa a lógica pura do app (formatação, validação, filtro, países, histórico e o provedor Deezer
// com um cliente falso, sem rede). Rode com: npm run test:app
import { COUNTRIES, countryName, flagOf } from '../../src/lib/countries.ts';
import { formatCount, formatDate, formatDuration, formatRating, formatRelative } from '../../src/lib/format.ts';
import { containsProfanity } from '../../src/lib/profanity.ts';
import {
  editProfileSchema, loginSchema, onboardingSchema, resetSchema, signupSchema,
} from '../../src/lib/validation.ts';
import { pushHistory } from '../../src/features/search/historyList.ts';
import { chartCountries, COUNTRY_CHART_PLAYLISTS } from '../../src/services/music/charts.ts';
import { createDeezerProvider } from '../../src/services/music/deezer.ts';
import { MusicApiError } from '../../src/services/music/errors.ts';

let failed = 0;
let passed = 0;
const check = (name: string, condition: boolean, extra = '') => {
  console.log((condition ? 'OK   ' : 'FAIL ') + name + (extra ? ' - ' + extra : ''));
  condition ? passed++ : failed++;
};

// ---------- formatação ----------
check('data por extenso', formatDate('2001-03-12') === '12 de março de 2001');
check('data inválida vira null', formatDate('0000-00-00') === null && formatDate(null) === null);
check('duração em minutos', formatDuration(226) === '3:46');
check('duração com horas', formatDuration(3662) === '1 h 01 min');
check('duração zero vira null', formatDuration(0) === null && formatDuration(undefined) === null);
check('contagem compacta', formatCount(4112627) === '4,1 mi' && formatCount(12000) === '12 mil' && formatCount(950) === '950');
check('nota com vírgula', formatRating(4.5) === '4,5' && formatRating(null) === '–');
const now = Date.parse('2026-10-31T12:00:00Z');
check('tempo relativo', formatRelative('2026-10-31T09:00:00Z', now) === 'há 3 horas');
check('tempo relativo singular', formatRelative('2026-10-30T11:00:00Z', now) === 'há 1 dia');
check('tempo relativo agora', formatRelative('2026-10-31T11:59:50Z', now) === 'agora');
check('data futura não fica negativa', formatRelative('2027-01-01T00:00:00Z', now) === 'agora');

// ---------- filtro de palavrões ----------
check('barra palavrão', containsProfanity('que merda'));
check('barra com acento e maiúscula', containsProfanity('DESGRAÇA'));
check('barra com número no lugar da letra', containsProfanity('m3rda') && containsProfanity('p0rra'));
check('texto normal passa', !containsProfanity('Melhor música da Avril Lavigne.'));
check('não barra palavra que só contém o termo', !containsProfanity('disputa e computação'));

// ---------- validação de formulários ----------
check('login exige e-mail válido', !loginSchema.safeParse({ email: 'x', password: 'a' }).success);
check('login válido', loginSchema.safeParse({ email: 'a@b.co', password: 'a' }).success);
check('cadastro: senha curta recusada', !signupSchema.safeParse({ email: 'a@b.co', password: '1234567', confirm: '1234567' }).success);
check('cadastro: senhas diferentes recusadas', !signupSchema.safeParse({ email: 'a@b.co', password: '12345678', confirm: '12345679' }).success);
check('cadastro válido', signupSchema.safeParse({ email: 'a@b.co', password: '12345678', confirm: '12345678' }).success);
check('redefinir: senhas diferentes recusadas', !resetSchema.safeParse({ password: '12345678', confirm: 'x' }).success);
check('@ válido', onboardingSchema.safeParse({ displayName: 'Ana', username: 'ana_01.x' }).success);
check('@ com maiúscula, espaço ou curto é recusado',
  ['Ana', 'a b', 'ab', 'a'.repeat(21)].every((username) => !onboardingSchema.safeParse({ displayName: 'Ana', username }).success));
check('nome em branco é recusado', !onboardingSchema.safeParse({ displayName: '   ', username: 'ana' }).success);
check('bio de 161 caracteres é recusada', !editProfileSchema.safeParse({ displayName: 'Ana', bio: 'x'.repeat(161) }).success);
check('bio de 160 caracteres passa', editProfileSchema.safeParse({ displayName: 'Ana', bio: 'x'.repeat(160) }).success);

// ---------- países, bandeiras e rankings ----------
check('bandeiras', flagOf('BR') === '🇧🇷' && flagOf('PT') === '🇵🇹' && flagOf('US') === '🇺🇸');
check('bandeira de código inválido é vazia', flagOf('br') === '' && flagOf('BRA') === '' && flagOf(null) === '');
check('nome do país', countryName('BR') === 'Brasil' && countryName('ZZ') === null && countryName(null) === null);
check('lista sem códigos repetidos', new Set(COUNTRIES.map((c) => c.code)).size === COUNTRIES.length);
check('todos os códigos têm 2 letras maiúsculas', COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.code)));
check('lista em ordem alfabética', COUNTRIES.every((c, i) => i === 0 || COUNTRIES[i - 1].name.localeCompare(c.name, 'pt') <= 0));
check('todo país com ranking está na lista', chartCountries.every((code) => countryName(code) !== null));
check('ids de playlist são números positivos', Object.values(COUNTRY_CHART_PLAYLISTS).every((id) => Number.isInteger(id) && id > 0));

// ---------- histórico de busca ----------
check('histórico: mais recente primeiro', pushHistory(['a1', 'b2'], 'c3').join() === 'c3,a1,b2');
check('histórico: repetido sobe ao topo sem duplicar', pushHistory(['a1', 'b2', 'c3'], 'B2').join() === 'B2,a1,c3');
check('histórico: ignora termo curto ou vazio', pushHistory(['a1'], ' x ').join() === 'a1' && pushHistory(['a1'], '').join() === 'a1');
check('histórico: limita a 10', pushHistory(Array.from({ length: 10 }, (_, i) => `t${i}`), 'novo').length === 10);
check('histórico: guarda o termo aparado', pushHistory([], '  avril  ')[0] === 'avril');

// ---------- provedor Deezer com cliente falso ----------
const rawTrack = (id: number, albumId: number, artistId: number) => ({
  id, title: `Faixa ${id}`, duration: 200,
  artist: { id: artistId, name: `Artista ${artistId}`, picture_small: 's', picture_medium: 'm', picture_big: 'b', picture_xl: 'x' },
  album: { id: albumId, title: `Álbum ${albumId}`, cover_small: 's', cover_medium: 'm', cover_big: 'b', cover_xl: 'x' },
});
const calls: string[] = [];
const fake = {
  async get(path: string) {
    calls.push(path);
    if (path.startsWith('/playlist/')) {
      // 4 faixas: 2 álbuns e 2 artistas repetidos
      return { data: [rawTrack(1, 10, 100), rawTrack(2, 10, 100), rawTrack(3, 11, 101), rawTrack(4, 11, 100)] };
    }
    if (path === '/chart/0') return { tracks: { data: [rawTrack(9, 90, 900)] }, albums: { data: [] }, artists: { data: [] } };
    return { data: [] };
  },
};
const provider = createDeezerProvider(fake as never);

const world = await provider.getChart(5);
check('chart global usa /chart/0', calls.includes('/chart/0') && world.tracks.length === 1);
const br = await provider.getChart(50, 'BR');
check('chart por país usa a playlist oficial', calls.includes(`/playlist/${COUNTRY_CHART_PLAYLISTS.BR}/tracks`));
check('chart por país: faixas na ordem', br.tracks.map((t) => t.id).join() === '1,2,3,4');
check('chart por país: álbuns sem repetir, na ordem', br.albums.map((a) => a.id).join() === '10,11');
check('chart por país: artistas sem repetir, na ordem', br.artists.map((a) => a.id).join() === '100,101');
check('chart por país: artista com foto e álbum com capa', br.artists[0].image?.xl === 'x' && br.albums[0].cover?.xl === 'x');
check('chart por país: álbum herda o artista da faixa', br.albums[0].artist.id === '100');
check('chart por país respeita o limite', (await provider.getChart(2, 'BR')).tracks.length === 2);
let unsupported: unknown = null;
try { await provider.getChart(10, 'UY'); } catch (error) { unsupported = error; }
check('país sem ranking dá erro claro', unsupported instanceof MusicApiError && (unsupported as MusicApiError).code === 'not_found');
check('busca vazia não chama a rede', (await provider.search('track', '   ')).items.length === 0 && !calls.some((c) => c.startsWith('/search')));

console.log(failed === 0 ? `\nTODOS OS ${passed} TESTES PASSARAM` : `\n${failed} FALHARAM, ${passed} passaram`);
process.exit(failed === 0 ? 0 : 1);
