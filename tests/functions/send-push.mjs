// Testa a lógica pura do send-push. Precisa de Node 22.18 ou mais novo (roda .ts direto).
import { buildMessage, deadTokens, isAuthorized, isExpoToken, parsePayload } from '../../supabase/functions/send-push/message.ts';

let failed = 0;
let passed = 0;
const check = (name, condition, extra = '') => {
  console.log((condition ? 'OK   ' : 'FAIL ') + name + (extra ? ' - ' + extra : ''));
  condition ? passed++ : failed++;
};

const event = (type, extra = {}) => ({
  type: 'INSERT',
  table: 'notifications',
  record: { id: 'n1', recipient_id: 'u1', actor_id: 'u2', type, review_id: 'r1', ...extra },
});

check('payload válido', parsePayload(event('like'))?.type === 'like');
check('ignora UPDATE', parsePayload({ ...event('like'), type: 'UPDATE' }) === null);
check('ignora outra tabela', parsePayload({ ...event('like'), table: 'reviews' }) === null);
check('ignora tipo desconhecido', parsePayload(event('banana')) === null);
check('ignora lixo', parsePayload(null) === null && parsePayload({}) === null && parsePayload('x') === null);
check('review_id ausente vira null', parsePayload(event('follow', { review_id: null }))?.review_id === null);

const ctx = { actorName: 'Gabriel', actorUsername: 'gabriel', mediaTitle: 'Under My Skin' };
const follow = buildMessage(parsePayload(event('follow', { review_id: null })), ctx);
check('follow', follow.title === 'Novo seguidor' && follow.body === 'Gabriel começou a seguir você.' && follow.data.username === 'gabriel');
const like = buildMessage(parsePayload(event('like')), ctx);
check('like', like.body === 'Gabriel curtiu sua review de Under My Skin.' && like.data.reviewId === 'r1' && like.data.type === 'like');
const comment = buildMessage(parsePayload(event('comment')), ctx);
check('comment', comment.body === 'Gabriel comentou na sua review de Under My Skin.');
check('sem título do item', buildMessage(parsePayload(event('like')), { ...ctx, mediaTitle: null }).body === 'Gabriel curtiu sua review.');
const long = buildMessage(parsePayload(event('like')), { ...ctx, actorName: 'A'.repeat(200), mediaTitle: 'B'.repeat(200) });
check('nomes longos são cortados', long.body.length < 140 && long.body.includes('…'), 'tamanho=' + long.body.length);

check('segredo correto autoriza', isAuthorized('abc123', 'abc123'));
check('segredo errado ou ausente recusa',
  !isAuthorized('abc124', 'abc123') && !isAuthorized('abc', 'abc123') && !isAuthorized(null, 'abc123') && !isAuthorized('', 'abc123'));
check('token do Expo', isExpoToken('ExponentPushToken[abc]') && isExpoToken('ExpoPushToken[abc]') && !isExpoToken('abc') && !isExpoToken('ExponentPushToken[]'));
const dead = deadTokens(
  ['a', 'b', 'c'],
  [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }, { status: 'error', details: { error: 'MessageRateExceeded' } }],
);
check('só remove tokens DeviceNotRegistered', dead.length === 1 && dead[0] === 'b');

console.log(failed === 0 ? `TODOS OS ${passed} TESTES PASSARAM` : `${failed} FALHA(S), ${passed} ok`);
process.exit(failed === 0 ? 0 : 1);
