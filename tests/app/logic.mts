// Testa a lógica pura do app (formatação, validação, filtro, países, histórico e o provedor Deezer
// com um cliente falso, sem rede). Rode com: npm run test:app
import { COUNTRIES, countryName, flagOf } from '../../src/lib/countries.ts';
import {
  formatCount, formatDate, formatDuration, formatRating, formatRelative, formatReviewCounts, plural,
} from '../../src/lib/format.ts';
import { containsProfanity } from '../../src/lib/profanity.ts';
import {
  editProfileSchema, loginSchema, onboardingSchema, resetSchema, signupSchema,
} from '../../src/lib/validation.ts';
import { pushHistory } from '../../src/features/search/historyList.ts';
import { chartCountries, COUNTRY_CHART_PLAYLISTS } from '../../src/services/music/charts.ts';
import { createDeezerProvider } from '../../src/services/music/deezer.ts';
import { MusicApiError } from '../../src/services/music/errors.ts';
import { HOP_ROOM, HOPS, hopKeyframes, MAX_STEP, PLAY_AT, staffGeometry, stemsUp } from '../../src/lib/staff.ts';
import { classifyFailure, failureMessage } from '../../src/lib/errors.ts';
import { deezerImageAt } from '../../src/lib/images.ts';

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
check('plural', plural(1, 'música', 'músicas') === '1 música' && plural(0, 'música', 'músicas') === '0 músicas' && plural(3, 'álbum', 'álbuns') === '3 álbuns');
check('resumo por tipo', formatReviewCounts({ tracks: 42, albums: 7, artists: 3 }) === '42 músicas · 7 álbuns · 3 artistas');
check('resumo omite tipos zerados', formatReviewCounts({ tracks: 1, albums: 0, artists: 2 }) === '1 música · 2 artistas');
check('resumo vazio vira null', formatReviewCounts({ tracks: 0, albums: 0, artists: 0 }) === null);
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

// ---------- partitura animada (MusicLoader) ----------
const g1 = staffGeometry(1);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
check('nota no passo 0 fica na linha de baixo', near(g1.headY(0), g1.lineY(4)));
check('nota no passo 8 fica na linha de cima', near(g1.headY(MAX_STEP), g1.lineY(0)));
check('nota no passo 4 fica na linha do meio', near(g1.headY(4), g1.lineY(2)));
check('passo 1 fica entre a 1a e a 2a linha de baixo', near(g1.headY(1), (g1.lineY(4) + g1.lineY(3)) / 2));
check('as 5 linhas ficam dentro da altura do componente', g1.lineY(0) > 0 && g1.lineY(4) < g1.height);
check('a maior cabeca cabe acima da linha de cima', g1.lineY(0) - g1.headH / 2 >= 0);
// Pior caso das notas usadas no componente: haste subindo da posição mais alta com haste para cima (passo 3/4)
// e descendo da mais baixa com haste para baixo (passo 4/5).
check('haste para cima nao sai pelo topo do componente', g1.headY(4) - g1.stemH >= 0);
check('haste para baixo nao sai pela base do componente', g1.headY(4) + g1.stemH <= g1.height);
check('haste sobe nas notas baixas e desce nas altas', stemsUp([2]) && !stemsUp([5]) && !stemsUp([4]));
check('haste de colcheias ligadas segue a media', stemsUp([3, 4]) && !stemsUp([4, 5]));
check('versao compacta e proporcional', near(staffGeometry(0.5).height * 2, g1.height) && near(staffGeometry(0.5).gap * 2, g1.gap));
// Pulinhos e cor no meio da pauta
const hk = hopKeyframes(1);
const hk2 = hopKeyframes(2);
const hopAt = (p: number) => {
  // interpolacao linear entre os pontos, como faz o Animated
  for (let i = 1; i < hk.input.length; i++) {
    if (p <= hk.input[i]) {
      const t = (p - hk.input[i - 1]) / (hk.input[i] - hk.input[i - 1]);
      return hk.output[i - 1] + t * (hk.output[i] - hk.output[i - 1]);
    }
  }
  return 0;
};
check('pulinhos: pontos crescem de 0 a 1 (exigencia do interpolate)', hk.input[0] === 0 && hk.input.at(-1) === 1 && hk.input.every((x, i) => i === 0 || x > hk.input[i - 1]));
check('pulinhos: um valor por ponto', hk.input.length === hk.output.length);
check('pulinhos: so sobem (negativo) e a nota entra e sai no lugar', hk.output.every((y) => y <= 0) && hk.output[0] === 0 && hk.output.at(-1) === 0);
check('pulinhos: pousa entre um pulo e outro', near(hopAt(0.26), 0) && near(hopAt(0.4), 0) && near(hopAt(0.62), 0));
check('pulinhos: o pulo pequeno sobe 6px', near(hopAt(0.2), -6));
check('pulinhos: o pulo do meio e o maior, no meio da pauta', near(hopAt(PLAY_AT), -14) && Math.min(...hk.output) === -14);
check('pulinhos: o pulo do meio e simetrico', near(hopAt(0.45), hopAt(0.55)));
check('pulinhos: o arco e uma parabola (1/4 do pulo = 75% da altura)', near(hopAt(0.42 + 0.04), -14 * 0.75));
check('pulinhos: nao ha pulo nas pontas (a nota esta aparecendo/sumindo)', near(hopAt(0.05), 0) && near(hopAt(0.95), 0));
check('pulinhos acompanham a escala', near(Math.min(...hk2.output), -28) && hk2.input.join() === hk.input.join());
check('o pulo maior e o do meio', HOPS.filter((h) => h.height === HOP_ROOM).length === 1 && HOPS.find((h) => h.height === HOP_ROOM)!.from < PLAY_AT && HOPS.find((h) => h.height === HOP_ROOM)!.to > PLAY_AT);
check('a haste mais alta, no pulo mais alto, ainda cabe no componente', g1.headY(4) - g1.stemH - HOP_ROOM >= 0);
check('10% maior: pauta e notas crescem juntas', near(staffGeometry(1.1).height / g1.height, 1.1) && near(staffGeometry(1.1).headW / g1.headW, 1.1) && near(staffGeometry(1.1).gap / g1.gap, 1.1));
check('largura de nota ligada cobre as duas cabecas', g1.noteWidth === g1.pairGap + g1.headW);

// ---------- tipo de falha (mensagens de erro) ----------
const networkFail = new TypeError('Network request failed');
check('sem internet ganha de qualquer outro motivo', classifyFailure(new MusicApiError('rate_limited'), false) === 'offline' && classifyFailure(networkFail, false) === 'offline');
check('Deezer: limite de buscas', classifyFailure(new MusicApiError('rate_limited'), true) === 'catalog_busy');
check('Deezer: fora do ar', classifyFailure(new MusicApiError('network'), true) === 'catalog_down' && classifyFailure(new MusicApiError('invalid_response'), null) === 'catalog_down');
check('Deezer: item inexistente', classifyFailure(new MusicApiError('not_found'), true) === 'not_found');
check('Supabase: falha de rede = servidor fora do ar', classifyFailure({ message: 'TypeError: Network request failed', code: '' }, true) === 'server_down');
check('Supabase: Edge Function sem resposta', classifyFailure({ name: 'FunctionsFetchError', message: 'Failed to send a request' }, true) === 'server_down');
check('Supabase: 5xx = fora do ar (ex.: projeto pausado)', classifyFailure({ message: 'Service Unavailable', status: 503 }, true) === 'server_down');
check('Supabase: erro do banco = servidor com problema', classifyFailure({ message: 'permission denied', code: '42501', details: null }, true) === 'server_error');
check('Supabase: Edge Function respondeu erro', classifyFailure({ name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code' }, true) === 'server_error');
check('sem saber da conexao, falha de rede ainda e servidor fora do ar', classifyFailure(networkFail, null) === 'server_down');
check('erro desconhecido', classifyFailure('x', true) === 'unknown' && classifyFailure(null, true) === 'unknown' && classifyFailure(new Error('boom'), true) === 'unknown');
check('mensagens diferentes por motivo', new Set([
  failureMessage(null, false), failureMessage(networkFail, true), failureMessage({ code: '1', message: 'x' }, true),
  failureMessage(new MusicApiError('network'), true), failureMessage(new MusicApiError('rate_limited'), true),
]).size === 5);

// ---------- capa grande para a imagem de compartilhar ----------
const md = 'https://cdn-images.dzcdn.net/images/cover/4c07cc728fd1531094bbf11235afef34/250x250-000000-80-0-0.jpg';
check('capa do Deezer vira 1000px', deezerImageAt(md, 1000) === md.replace('/250x250-', '/1000x1000-'));
check('foto de artista do Deezer tambem', deezerImageAt('https://cdn-images.dzcdn.net/images/artist/abc/56x56-000000-80-0-0.jpg', 1000)?.endsWith('/1000x1000-000000-80-0-0.jpg') === true);
check('endereco de outro formato fica igual', deezerImageAt('https://x.supabase.co/avatars/u/avatar.jpg?v=1', 1000) === 'https://x.supabase.co/avatars/u/avatar.jpg?v=1');
check('sem capa continua sem capa', deezerImageAt(null, 1000) === null && deezerImageAt('', 1000) === null);

console.log(failed === 0 ? `\nTODOS OS ${passed} TESTES PASSARAM` : `\n${failed} FALHARAM, ${passed} passaram`);
process.exit(failed === 0 ? 0 : 1);
